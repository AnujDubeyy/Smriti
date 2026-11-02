import {requireAccount} from '../../lib/page-access';
import {Onboarding} from '../../components/care-workflows';
export const dynamic='force-dynamic';
export default async function Page(){await requireAccount();return <Onboarding/>;}
