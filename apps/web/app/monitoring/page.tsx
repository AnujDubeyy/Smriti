export const dynamic='force-dynamic';
import {workspace} from '../../lib/workspace';
import {LogsPanel} from '../../components/logs-panel';
export default async function Page(){const p=await workspace();return <><h1>Welcome {p.care_details.doctor_name}</h1><p>Monitoring for {p.preferred_name}</p><details><summary>Patient details and memories</summary><p>Age: {p.care_details.age}</p><p>{p.care_details.health_notes}</p><p>{p.care_details.memories}</p></details><LogsPanel patientId={p.id}/></>;}
