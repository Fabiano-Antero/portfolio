const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function build(){
 const certificates=JSON.parse(fs.readFileSync(path.join(root,'assets/data/certifications.json'),'utf8'));
 const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 const arrow=direction=>`<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${direction==='prev'?'m14 6-6 6 6 6':'m10 6 6 6-6 6'}"/></svg>`;
 const cards=certificates.map((certificate,index)=>`<a class="certification-card" href="${esc(certificate.url)}" target="_blank" rel="noopener noreferrer" data-certificate-index="${index}"><div class="certification-card-brand"><img src="assets/img/certifications/${certificate.provider.toLowerCase()}.svg" width="104" height="40" alt="${certificate.provider}" loading="lazy" decoding="async"><svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M8 15V8h7M33 8h7v7M40 33v7h-7M15 40H8v-7M18 24l4 4 9-9"/></svg></div><div class="certification-card-body"><p class="mono certification-category">${esc(certificate.category)}</p><h3 data-no-translate>${esc(certificate.title)}</h3></div><div class="certification-card-meta"><div><span class="mono">CARGA HORÁRIA</span><p data-no-translate>${String(certificate.hours).replace('.',',')} h</p></div><div><span class="mono">CONCLUSÃO</span><p><time datetime="${certificate.completed}" data-no-translate>${certificate.completed.slice(0,4)}</time></p></div></div><span class="certification-card-link">Ver certificado <span aria-hidden="true">↗</span></span></a>`).join('');
 const section=`<!-- certifications:start -->
  <section id="certificacoes" class="section certifications-section" aria-labelledby="certifications-title"><div class="container certifications-grid">
    <div class="section-heading certifications-copy reveal"><p class="eyebrow">CERTIFICAÇÕES</p><h2 id="certifications-title">Aprender faz parte<br> de construir.</h2><p>Estudo contínuo para conectar experiência do usuário, estratégia de produto e desenvolvimento. Conhecimentos que levo da pesquisa à interface em produção.</p><p class="mono accent certification-topics">UX / PRODUTO / DESENVOLVIMENTO</p><p class="mono certifications-total">${certificates.length} CERTIFICADOS / ALURA + UDEMY</p></div>
    <div class="certifications-stage reveal"><div class="certifications-viewport" role="region" aria-roledescription="carrossel" aria-label="Certificados de cursos" data-certifications-viewport><div class="certifications-track">${cards}</div></div><div class="certifications-controls"><div class="certifications-buttons"><button type="button" class="certification-arrow" data-certificate-prev aria-label="Certificado anterior">${arrow('prev')}</button><button type="button" class="certification-arrow" data-certificate-next aria-label="Próximo certificado">${arrow('next')}</button></div><p class="mono certifications-position" data-no-translate><span data-certificate-position>01</span><span aria-hidden="true"> / </span><span>${String(certificates.length).padStart(2,'0')}</span></p></div></div>
  </div></section>
<!-- certifications:end -->`;
 const file=path.join(root,'index.html');let html=fs.readFileSync(file,'utf8');
 if(html.includes('<!-- certifications:start -->'))html=html.replace(/<!-- certifications:start -->[\s\S]*?<!-- certifications:end -->/,section);
 else html=html.replace('  <section id="experiencia"',section+'\n  <section id="experiencia"');
 fs.writeFileSync(file,html);
}
module.exports=build;
if(require.main===module)build();
