'use client';
import {useMemo} from 'react';
import {qrcodegen} from '../lib/qr/qrcodegen';

/** Local MIT-licensed QR encoder: invitation secrets are never sent to an image API. */
export function InvitationQr({value}:{value:string}){
 const code=useMemo(()=>qrcodegen.QrCode.encodeText(value,qrcodegen.QrCode.Ecc.MEDIUM),[value]);
 const quiet=4;
 const size=code.size+quiet*2;
 const squares:string[]=[];
 for(let y=0;y<code.size;y++)for(let x=0;x<code.size;x++){
  if(code.getModule(x,y))squares.push('M'+(x+quiet)+','+(y+quiet)+'h1v1h-1z');
 }
 return <svg id="smriti-invitation-qr" role="img" aria-label="QR code for single-use Smriti caretaker invitation"
  viewBox={'0 0 '+size+' '+size} shapeRendering="crispEdges" width="260" height="260" style={{maxWidth:'100%',background:'#fff',padding:10,borderRadius:16}}>
  <rect width={size} height={size} fill="#fff"/>
  <path d={squares.join('')} fill="#121212"/>
 </svg>;
}
