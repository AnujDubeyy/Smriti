import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isEntryRoute,isDoctorRoute,showCareNavigation,isPillarActive} from '../lib/navigation.ts';

test('authentication and QR entry screens do not show patient navigation',()=>{
 for(const path of ['/login','/signup','/onboarding','/join','/auth/callback','/recover','/reset-password']){
  assert.equal(isEntryRoute(path),true,path);
  assert.equal(showCareNavigation(path),false,path);
 }
});
test('doctor workspace does not receive caretaker assessment tabs',()=>{
 assert.equal(isDoctorRoute('/doctor'),true);
 assert.equal(isDoctorRoute('/doctor/patient/example'),true);
 assert.equal(showCareNavigation('/doctor'),false);
 assert.equal(showCareNavigation('/doctor/patient/example'),false);
});
test('patient, profile and care pillar pages use accessible responsive navigation',()=>{
 for(const path of ['/','/profile','/assessment','/assessment/activity/one','/companionship','/monitoring','/permissions']){
  assert.equal(showCareNavigation(path),true,path);
 }
});
test('nested active pillar routes match only their own section',()=>{
 assert.equal(isPillarActive('/assessment','assessment'),true);
 assert.equal(isPillarActive('/assessment/activity','assessment'),true);
 assert.equal(isPillarActive('/assessment-old','assessment'),false);
 assert.equal(isPillarActive('/companionship/call','companionship'),true);
 assert.equal(isPillarActive('/monitoring/history','monitoring'),true);
 assert.equal(isPillarActive('/profile','monitoring'),false);
});
