import {requireAccount} from '../../lib/page-access';
import {AcceptInvite} from '../../components/care-workflows';
export const dynamic='force-dynamic';
export default async function Page(){await requireAccount();return <AcceptInvite/>;}
