import {AuthForm} from '../../components/auth-form';
import {authConfig} from '../../lib/auth/config';
export const dynamic='force-dynamic';
export default function Signup(){return <AuthForm mode="signup" configured={!!authConfig() && !!process.env.SMRITI_APP_URL}/>;}
