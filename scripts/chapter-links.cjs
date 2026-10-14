// Small, decorative line illustrations shared by the case chapter navigation.
// Text remains the accessible and translatable name of each link.
const drawings={
 contexto:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
 jornada:'<circle cx="4" cy="17" r="2"/><circle cx="12" cy="7" r="2"/><path d="M6 17h2a4 4 0 0 0 4-4V9m2-2h3a3 3 0 0 1 3 3v8m-3-3 3 3 3-3"/>',
 operacao:'<path d="M3 5h7m4 0h7M3 12h12m4 0h2M3 19h2m4 0h12"/><circle cx="12" cy="5" r="2"/><circle cx="17" cy="12" r="2"/><circle cx="7" cy="19" r="2"/>',
 reserva:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-13 6 2 2 5-5"/>',
 pagamentos:'<path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/><path d="M15 8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9m3-10v12"/>',
 conversas:'<path d="M14 15H7l-4 3V7a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3Z"/><path d="M8 18h9l4 3V11M7 8h7m-7 3h4"/>',
 construcao:'<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 10v10M3 7l9 5 9-5M7.5 4.5l9 5v4"/>',
 entrega:'<path d="M13 21H4V5h4m8 0h4v7"/><rect x="8" y="3" width="8" height="4" rx="1.5"/><path d="M8 11h7m-7 4h3m4 3 2 2 5-6"/>',
 pesquisa:'<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6M7 11l2-3 3 2 2-4"/>',
 antecipacao:'<circle cx="9" cy="14" r="7"/><path d="M11 11H8a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 1 0 3H7m2-8v10m8-10V3m-3 3 3-3 3 3"/>',
 pix:'<path d="m12 3 9 9-9 9-9-9 9-9ZM6 9h3l3 3 3-3h3M6 15h3l3-3 3 3h3"/>',
 recursos:'<path d="M20 7H6a3 3 0 0 1 0-6h12v6M3 4v14a3 3 0 0 0 3 3h14V7m0 5h-5v5h5"/><circle cx="16.5" cy="14.5" r=".5"/>',
 sistema:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M17.5 14v7M14 17.5h7"/>',
 perfil:'<circle cx="9" cy="7" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m3-13h3m-3 5h3m-3 5h3"/>',
 descoberta:'<circle cx="12" cy="12" r="9"/><path d="m15 9-2 4-4 2 2-4 4-2ZM12 1v2m0 18v2M1 12h2m18 0h2"/>',
 recuperacao:'<path d="M5 9a8 8 0 1 1-1 7M5 4v5h5m2-2v5l3 2"/>',
 identidade:'<path d="m12 2 2.5 5.5L20 10l-5.5 2.5L12 18l-2.5-5.5L4 10l5.5-2.5L12 2Zm7 15v5m-2.5-2.5h5"/>',
 fundamentos:'<path d="M7 3h6v14a4 4 0 1 1-8 0V5a2 2 0 0 1 2-2Zm6 5 5-3 3 5-8 5m-1 6h8v-6h-7M5 9h8M5 13h8"/><circle cx="9" cy="17" r=".5"/>',
 tipografia:'<path d="m3 20 6-16 6 16M5 14h8m5-3h3v9m0-7h-2a3 3 0 0 0 0 6h2"/>',
 ritmo:'<path d="M3 3v18m18-18v18M6 12h12m-9-3-3 3 3 3m6-6 3 3-3 3M9 5h6m-6 14h6"/>',
 componentes:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><path d="m17.5 2 4.5 4.5-4.5 4.5L13 6.5 17.5 2ZM3 17.5h7m-3.5-3.5v7"/>',
 aplicacao:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18m-8 8 4-4m-4 0h4v4M6 6.5h.01m3 0h.01"/>'
};
drawings.encerramento=drawings.entrega;
module.exports=(href,label)=>{
 const id=href.replace(/^#/,'');
 if(!drawings[id])throw new Error('Unknown case chapter: '+id);
 const text=label.replace(/^\d+\s+/,'');
 return `<a class="chapter-link case-chapter-link" href="${href}"><svg class="chapter-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${drawings[id]}</svg><span>${text}</span></a>`;
};
