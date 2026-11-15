import 'core-js/actual/string/replace-all';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import App from './App';
import './style.css';
const rootRoute=createRootRoute({component:App});
const indexRoute=createRoute({getParentRoute:()=>rootRoute,path:'/'});
const settingsRoute=createRoute({getParentRoute:()=>rootRoute,path:'/settings'});
const router=createRouter({routeTree:rootRoute.addChildren([indexRoute,settingsRoute])});
declare module '@tanstack/react-router' { interface Register { router:typeof router } }
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><RouterProvider router={router}/></React.StrictMode>);
