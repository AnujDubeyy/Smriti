import {localDoctorPreview} from '../../lib/local-doctor-preview';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {requireAccount} from '../../lib/page-access';
import {ProfileEditor} from '../../components/profile-editor';
import {normalizeCaregiverRelationship} from '../../lib/clinical-intake';
export const dynamic='force-dynamic';
export default async function Profile(){
 if(localDoctorPreview())return <section className="journal-card"><h1>Ramesh Sharma’s profile</h1><p>Fictional demo account. Live profile editing requires sign-in.</p></section>;
 const client=await requireAccount();
 const {data:{user}}=await client.auth.getUser();
 const {data:account,error}=await client.from('app_users').select('onboarding_role,display_name').eq('id',user!.id).single();
 if(error||!account)return <section><h1>Profile unavailable</h1><p>Try again.</p></section>;
 if(!account.onboarding_role)redirect('/onboarding');
 const role: 'doctor'|'caregiver'=account.onboarding_role==='doctor'?'doctor':'caregiver';
 if(role==='doctor')return <section style={{maxWidth:650,margin:'auto'}}>
  <h1>Doctor profile</h1><p>Edit your professional details or change the password for your Smriti account.</p>
  <p><Link className="button secondary" href="/onboarding">Edit doctor details</Link></p>
  <ProfileEditor isAnonymous={!!user!.is_anonymous} email={user!.email} role="doctor"/>
 </section>;
 const {data:patient,error:patientError}=await client.from('patients')
  .select('id,preferred_name,care_details').eq('linked_user_id',user!.id).eq('synthetic',true)
  .order('created_at').limit(1).maybeSingle();
 if(patientError||!patient)return <section><h1>No connected profile</h1><p>Ask your doctor to share a caretaker QR invitation.</p></section>;
 const d=(patient.care_details||{}) as Record<string,unknown>;
 const normalized=normalizeCaregiverRelationship(d.relationship,d.relationship_other);
 return <ProfileEditor role="caregiver" patientId={patient.id} email={user!.email}
  isAnonymous={!!user!.is_anonymous}
  initial={{
   patient_name:patient.preferred_name,caretaker_name:String(d.caregiver_name||account.display_name||''),
   relationship:normalized.relationship,
   relationship_other:normalized.relationship_other,
   date_of_birth:String(d.date_of_birth||''),
   sex:String(d.sex||'prefer_not_to_say'),family_count:Number(d.family_count||0),
   support_notes:String(d.support_notes||'')
  }}
 />;
}
