import { redirect } from 'next/navigation';

/** Issued visas now live as tabs on the Visas page. Kept so old links still work. */
export default function IssuedVisasRedirect() {
  redirect('/visas?tab=groups');
}
