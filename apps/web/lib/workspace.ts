import 'server-only';
import {redirect} from 'next/navigation';
import {requireAccount} from './page-access';
export async function workspace(){
 const client=await requireAccount();
 const {data,error}=await client.from('patients').select('id,preferred_name,locale,care_details').order('created_at').limit(1).maybeSingle();
 if(error)throw new Error('Unable to load your care account. Please try again.');
 if(!data?.care_details)redirect('/onboarding');
 return data;
}
