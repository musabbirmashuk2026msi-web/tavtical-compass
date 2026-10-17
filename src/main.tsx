import React from 'react';import{createRoot}from'react-dom/client';import App from'./App';import'./index.css';createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
const native=!!(window as unknown as {Capacitor?:{isNativePlatform?:()=>boolean}}).Capacitor?.isNativePlatform?.();
if('serviceWorker' in navigator&&import.meta.env.PROD&&!native){window.addEventListener('load',()=>{navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(()=>{})})}
