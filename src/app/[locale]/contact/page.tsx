import type {Metadata} from 'next';
import {redirect,notFound} from 'next/navigation';
import {isLocale} from '@/i18n/config';
import {InformationPage,informationTitles} from '@/components/InformationPage';
export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{
 const {locale}=await params;if(locale!=='en'&&locale!=='tr')return {};
 return {title:informationTitles[locale].contact,description:locale==='tr'?'IPScans ürünleri, ağ araçları ve yardım kaynakları.':'IPScans products, network tools and help resources.',alternates:{canonical:`/${locale}/contact`,languages:{en:'/en/contact',tr:'/tr/contact','x-default':'/en/contact'}}};
}
export default async function Page({params}:{params:Promise<{locale:string}>}){
 const {locale}=await params;if(!isLocale(locale))notFound();if(locale!=='en'&&locale!=='tr')redirect('/en/contact');
 return <InformationPage locale={locale} page="contact"/>;
}

