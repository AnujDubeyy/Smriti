import Link from 'next/link';
import cards from './doctor-patient-card.module.css';
type Patient={patient_id:string;patient_name:string;caretaker_name:string;status:string;sharing_enabled:boolean};
export function DoctorPatientOverview({patients,focus}:{
 patients:Patient[];focus:'monitoring'|'conversations'
}){
 const monitoring=focus==='monitoring';
 return <section className="doctor-home">
  <span className="eyebrow">DOCTOR WORKSPACE</span>
  <h1>{monitoring?'Patient monitoring':'Companionship conversations'}</h1>
  <p className="intro">{monitoring
   ?'Review observations and patient progress after caretaker sharing is enabled.'
   :'Review saved patient–Smriti conversations with caretaker consent. The doctor cannot enter the call as the patient.'}</p>
  <p style={{margin:'16px 0'}}><Link className="button secondary" href="/doctor">← Back to patients</Link></p>
  <div className="doctor-onboarding-next">
   <h2>Connected patients</h2>
   {patients.length?<ul className={cards.list}>{patients.map(p=><li key={p.patient_id} className={cards.card}>
    <div className={cards.identity}>
     <strong>{p.patient_name}</strong>
     <p>Caretaker: {p.caretaker_name}</p>
     <small>{p.status!=='joined'?'Caretaker has not joined yet':p.sharing_enabled?'Doctor sharing enabled':'Waiting for caretaker permission'}</small>
    </div>
    {p.status==='joined'&&p.sharing_enabled
     ?<div className={cards.actions}><Link className="button secondary" href={'/doctor/patient/'+p.patient_id+(monitoring?'':'#transcripts')}>
       {monitoring?'Open monitoring':'View conversations'}
      </Link></div>
     :null}
   </li>)}</ul>:<p>No connected patients yet. Create a patient from your workspace.</p>}
  </div>
 </section>;
}
