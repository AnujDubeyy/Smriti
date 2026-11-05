export const dynamic='force-dynamic';
import {workspace} from '../../lib/workspace';
import {LogsPanel} from '../../components/logs-panel';
import {localDoctorPreview,demoPatients} from '../../lib/local-doctor-preview';
export default async function Page(){if(localDoctorPreview())return <><h1>Ramesh’s care journal</h1><LogsPanel patientId={demoPatients[0].patient_id} localPreview/></>;const p=await workspace();return <><h1>{p.preferred_name}’s care journal</h1><LogsPanel patientId={p.id}/></>;}
