import { redirect } from 'next/navigation';

/** Family & group bookings now live as a tab on Bookings. Kept so old links still work. */
export default function GroupsRedirect() {
  redirect('/bookings?tab=groups');
}
