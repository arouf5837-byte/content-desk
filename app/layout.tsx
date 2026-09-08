import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Content Desk — তোমার কনটেন্ট ওয়ার্কস্পেস',description:'ইকমার্স ও এজেন্সির কনটেন্ট, পোস্ট এবং পারফরম্যান্সের ব্যক্তিগত ওয়ার্কস্পেস।',icons:{icon:'/icon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="bn"><body>{children}</body></html>}
