import {resultLabel,type Assignment} from '../lib/assessment-activities';
export function AssessmentResult({assignment:a}:{assignment:Assignment}){
 if(!a.response_text)return null;
 return <details><summary>Review response</summary><p>{a.response_text}</p>
 {a.caregiver_observation&&<p>Caretaker observation · {a.caregiver_observation}</p>}
 <p>{typeof a.task_score==='number'?a.task_score+' '+resultLabel(a.instrument_code):'No activity count was recorded.'}</p></details>;
}
