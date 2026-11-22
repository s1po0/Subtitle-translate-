import 'core-js/actual/string/replace-all';
import React from 'react';
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/600.css';
import '@fontsource/vazirmatn/700.css';
import ReactDOM from 'react-dom/client';
import { createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import App from './App';
import './style.css';
const rootRoute=createRootRoute({component:App});
const indexRoute=createRoute({getParentRoute:()=>rootRoute,path:'/'});
const settingsRoute=createRoute({getParentRoute:()=>rootRoute,path:'/settings'});
const router=createRouter({routeTree:rootRoute.addChildren([indexRoute,settingsRoute])});
declare module '@tanstack/react-router' { interface Register { router:typeof router } }
class AppBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}> {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(error:unknown){console.error('Application error',error);}
 render(){return this.state.failed?<div className="recovery" role="alert"><img src="/icon.png" alt=""/><h1>بەرنامەکە نەکرایەوە</h1><p>تکایە دووبارە هەوڵ بدەرەوە. ئەگەر کێشەکە مایەوە Android System WebView نوێ بکەرەوە.</p><button onClick={()=>location.reload()}>دووبارە هەوڵبدەوە</button></div>:this.props.children;}
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AppBoundary><RouterProvider router={router}/></AppBoundary></React.StrictMode>);
