import 'server-only';
import {redirect} from 'next/navigation';
import {authenticatedClient} from './auth/access';
export async function requireAccount(){const auth=await authenticatedClient();if(!auth.client)redirect('/login');return auth.client;}
