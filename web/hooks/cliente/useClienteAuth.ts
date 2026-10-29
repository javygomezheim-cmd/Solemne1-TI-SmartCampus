
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function useClienteAuth() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [orgId, setOrgId] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (active) {
          setEmail('');
          setOrgId('');
          setChecking(false);
          router.replace('/');
        }
        return;
      }

      if (active) setChecking(true);

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (!active) return;

        if (!userDoc.exists()) {
          await signOut(auth);
          if (active) router.replace('/');
          return;
        }

        const perfil = userDoc.data();
        const role = perfil.role;
        const organizacion = perfil.orgId;

        if (role === 'admin') {
          router.replace('/admin');
          return;
        }

        if (
          role !== 'cliente' ||
          typeof organizacion !== 'string' ||
          !organizacion.trim()
        ) {
          await signOut(auth);
          if (active) router.replace('/');
          return;
        }

        setEmail(user.email ?? '');
        setOrgId(organizacion);
        setChecking(false);
      } catch (error) {
        console.error('Error verificando el cliente:', error);

        if (active) {
          setEmail('');
          setOrgId('');
          setChecking(false);
          router.replace('/');
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  return { email, orgId, checking };
}
