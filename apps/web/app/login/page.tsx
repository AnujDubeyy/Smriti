import {redirect} from 'next/navigation';
import {AuthForm} from '../../components/auth-form';
import {authConfig} from '../../lib/auth/config';
import {authenticatedClient} from '../../lib/auth/access';
export const dynamic='force-dynamic';
export default async function Login(){
 const auth=await authenticatedClient();
 if(auth.client)redirect('/');
 return <AuthForm mode="login" configured={!!authConfig()}/>;
}
