import {test} from 'node:test';
import assert from 'node:assert/strict';
import {intakeSchema,relationshipOptions,diagnosisOptions,dementiaDiagnoses,normalizeCaregiverRelationship} from '../lib/clinical-intake.ts';
const base={
 caretaker_name:'Fictional Relative',patient_name:'Fictional Patient',
 relationship:'daughter',relationship_other:'',date_of_birth:'1950-01-01',
 sex:'female',family_count:3,locale:'hi-IN',
 blood_group:'unknown',diagnoses:['mci'],diagnosis_status:'confirmed_by_clinician',
 dementia_stage:'not_assessed',daily_support:'occasional',
 communication_support:['slower_pace'],other_condition:''
};
test('intake accepts a clinician-entered MCI profile without dementia stage',()=>{
 const x=intakeSchema.parse(base);
 assert.deepEqual(x.diagnoses,['mci']);
 assert.equal(x.dementia_stage,'not_assessed');
});
test('MCI is not treated as a stage of dementia',()=>{
 assert.equal((dementiaDiagnoses).includes('mci'),false);
 assert.equal(intakeSchema.safeParse({...base,dementia_stage:'mild'}).success,false);
});
test('Parkinsons disease alone cannot be labelled mild dementia',()=>{
 assert.equal(intakeSchema.safeParse({...base,diagnoses:['parkinsons'],dementia_stage:'mild'}).success,false);
});
test('confirmed Alzheimer diagnosis can store clinician-recorded moderate stage',()=>{
 assert.equal(intakeSchema.safeParse({...base,diagnoses:['alzheimers'],dementia_stage:'moderate'}).success,true);
});
test('dementia severity is disallowed for unconfirmed conditions',()=>{
 assert.equal(intakeSchema.safeParse({...base,diagnoses:['alzheimers'],diagnosis_status:'under_evaluation',dementia_stage:'severe'}).success,false);
});
test('relationship choices include caretakers who are not related by blood',()=>{
 const ids=relationshipOptions.map(([code])=>code);
 assert.ok(['daughter','son','wife','husband','father','uncle','aunt','no_blood_relation'].every(x=>ids.includes(x)));
 assert.equal(intakeSchema.safeParse({...base,relationship:'other'}).success,false);
 assert.equal(intakeSchema.safeParse({...base,relationship:'other',relationship_other:'family friend'}).success,true);
});
test('diagnosis unknown cannot be mixed with specific disorders',()=>{
 assert.ok(diagnosisOptions.some(([id])=>id==='under_evaluation'));
 assert.equal(intakeSchema.safeParse({...base,diagnoses:['under_evaluation','alzheimers']}).success,false);
});
test('bad inputs, unverifiable severity and invented diagnosis codes are rejected',()=>{
 assert.equal(intakeSchema.safeParse({...base,blood_group:'X+'}).success,false);
 assert.equal(intakeSchema.safeParse({...base,diagnoses:['made_up_condition']}).success,false);
 assert.equal(intakeSchema.safeParse({...base,communication_support:['unknown_need']}).success,false);
});

test('previously stored display values map to the relationship dropdown',()=>{
 assert.deepEqual(normalizeCaregiverRelationship('Son',''),{relationship:'son',relationship_other:''});
 assert.deepEqual(normalizeCaregiverRelationship('  Daughter  ','stale'),{relationship:'daughter',relationship_other:''});
 assert.deepEqual(normalizeCaregiverRelationship('No blood relation',''),{relationship:'no_blood_relation',relationship_other:''});
 assert.deepEqual(normalizeCaregiverRelationship('aunty',''),{relationship:'aunt',relationship_other:''});
});
test('legacy Other with a recognized relationship value chooses the standard dropdown option',()=>{
 assert.deepEqual(normalizeCaregiverRelationship('other','Son'),{relationship:'son',relationship_other:''});
});
test('custom caretakers retain original information instead of being silently replaced',()=>{
 assert.deepEqual(normalizeCaregiverRelationship('Family friend',''),{relationship:'other',relationship_other:'Family friend'});
 assert.deepEqual(normalizeCaregiverRelationship('Other','Family friend'),{relationship:'other',relationship_other:'Family friend'});
});
test('saving a normalized relation meets the caregiver intake validator',()=>{
 const normalized=normalizeCaregiverRelationship('Son','');
 assert.equal(intakeSchema.safeParse({...base,...normalized}).success,true);
});
