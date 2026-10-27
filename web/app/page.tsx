'use client';

import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();


const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    // 1. Autenticar al usuario con Firebase
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    // 2. Consultar su rol usando el UID de Firebase
    const userDoc = await getDoc(
      doc(db, 'users', userCredential.user.uid)
    );

    if (!userDoc.exists()) {
      await auth.signOut();
      setError('Tu cuenta no tiene un rol asignado.');
      return;
    }

    const role = userDoc.data().role;

    // 3. Redirigir según el rol existente
    if (role === 'admin') {
      router.replace('/admin');
    } else if (role === 'cliente') {
      router.replace('/cliente');
    } else {
      await auth.signOut();
      setError('Tu cuenta tiene un rol no válido.');
    }
  } catch (err) {
    console.error('Error de inicio de sesión:', err);
    setError('No se pudo iniciar sesión. Revisa tus credenciales y permisos.');
  } finally {
    setLoading(false);
  }
};


  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '400px', margin: '10vh auto', color: '#1f2937' }}>
      <div style={{ background: '#ffffff', padding: '2rem', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>
          Acceso Smart Campus
        </h1>
        
        {error && (
          <div style={{ background: '#fef2f2', color: '#991b1b', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Correo electrónico</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ marginTop: '0.5rem', background: loading ? '#9ca3af' : '#2563eb', color: 'white', padding: '0.75rem', borderRadius: '6px', fontWeight: 600, border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </main>
  );
}