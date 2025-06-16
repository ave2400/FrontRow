import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

function AdminOnly({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data, error } = await supabase.rpc('get_my_claim', {
        claim: 'role' 
      });

      if (error) {
        console.error('Error checking admin status:', error);
      }
      
      if (data === 'admin') {
        setIsAdmin(true);
      }

      setLoading(false);
    };

    checkAdminStatus();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      {isAdmin ? children : <div>You do not have permission to view this page.</div>}
    </>
  );
}

export default AdminOnly;

// --- HOW TO USE IN ANOTHER COMPONENT ---

// import AdminOnly from './AdminOnly';
// import AdminDashboard from './AdminDashboard';

// function App() {
//   return (
//     <div>
//       <h1>My Awesome App</h1>
//       <p>Some public content here.</p>
//
//       <AdminOnly>
//         {/* This will only be rendered if the user is an admin */}
//         <AdminDashboard />
//       </AdminOnly>
//     </div>
//   );
// }