import asyncio, json, sys
from playwright.async_api import async_playwright
URL='file:///home/claude/hayya-tv/dist/index.html'
DASH='file:///home/claude/hayya-tv/demo/dashboard-demo.html'
OUT='/home/claude/deck/shots/'
THU='2026-11-05T%s+03:00'; FRI='2026-11-06T%s+03:00'
NAME_EN={'name':{'l1':'Al-Hayy Mosque','l2':''}}
def base(lang): return {'defV':111, 'lang':lang, **(dict(NAME_EN, ampm='en') if lang=='en' else {})}
def merge(a,b):
  o=dict(a)
  for k,v in b.items(): o[k]=merge(o[k],v) if isinstance(v,dict) and isinstance(o.get(k),dict) else v
  return o
async def open_tv(b, lang, t, extra=None, w=1920, h=1080):
  pg=await b.new_page(viewport={'width':w,'height':h}, timezone_id='Asia/Riyadh')
  errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
  await pg.clock.install(time=t)
  st=merge(base(lang), extra or {})
  await pg.add_init_script("localStorage.setItem('hayya_tv_settings_v1', JSON.stringify(%s))" % json.dumps(st))
  await pg.goto(URL); await pg.add_style_tag(content='*{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}')
  await pg.clock.run_for(2500); pg._errs=errs; return pg
async def until(pg, js, step=1000, n=200):
  for _ in range(n):
    if await pg.evaluate(js): return True
    await pg.clock.run_for(step)
  return False
MAIN="!document.querySelector('#hpg').classList.contains('on') && getComputedStyle(document.querySelector('#main')).visibility==='visible'"
HP="document.querySelector('#hpg').classList.contains('on')"
async def snap(pg, name, lang):
  await pg.clock.run_for(600); await pg.screenshot(path=f'{OUT}{lang}_{name}.png'); print(lang, name, pg._errs[:2])
async def settings(pg, cat, js=''):
  await pg.evaluate(f"openSettings(); document.querySelector('nav [data-cat={cat}]').focus(); {js}"); await pg.clock.run_for(500)
async def run(lang):
  async with async_playwright() as p:
    b=await p.chromium.launch()
    # main screen and hadith page, landscape + portrait
    for tag,w,h,ex in (('L',1920,1080,{}),('P',1080,1920,{'orientation':'portrait'})):
      pg=await open_tv(b,lang,THU%'10:00:00',ex,w,h)
      await until(pg,MAIN); await snap(pg,'main_'+tag,lang)
      await until(pg,HP); await pg.clock.run_for(1500); await snap(pg,'hadith_'+tag,lang); await pg.close()
    # phases of a prayer (Dhuhr 12:07, iqamah 12:27)
    for name,t,ex in (('adhan','12:02:25',{}),('iqama','12:22:03',{}),('saver','12:26:00',{}),('azkar','12:33:30',{})):
      pg=await open_tv(b,lang,THU%t,ex); await pg.clock.run_for(65000 if name=='saver' else 500); await snap(pg,name,lang); await pg.close()
    pg=await open_tv(b,lang,THU%'12:08:00')
    await until(pg,"document.querySelector('#hpg').classList.contains('wait')"); await pg.clock.run_for(1500); await snap(pg,'waitpage',lang)
    await until(pg,"!document.querySelector('#hpg').classList.contains('wait')"); await pg.clock.run_for(300); await snap(pg,'countdown',lang); await pg.close()
    pg=await open_tv(b,lang,THU%'10:00:00'); await pg.evaluate("forced={k:'morning',until:Date.now()+1e9}"); await snap(pg,'morning',lang); await pg.close()
    # Friday: khutbah and an occasion on the hadith page
    pg=await open_tv(b,lang,FRI%'12:10:00'); await snap(pg,'khutbah',lang); await pg.close()
    pg=await open_tv(b,lang,FRI%'10:00:00',{'occ':{'items':{'friday':{'alone':True}}}}); await until(pg,HP); await pg.clock.run_for(1200); await snap(pg,'occasion',lang); await pg.close()
    # funeral notice on the main screen
    pg=await open_tv(b,lang,THU%'10:00:00',{'funerals':[{'id':'f1','name':'محمد بن عبدالله' if lang=='ar' else 'Muhammad bin Abdullah','g':'m','mode':'prayer','prayer':'dhuhr','start':'2026-11-05T09:00:00+03:00','on':True}]})
    await until(pg,MAIN); await snap(pg,'funeral',lang); await pg.close()
    # designs
    for tpl in ('night','royal','nabawi','andalus','ramadan','eid_fitr','ivory','p_maghrib'):
      pg=await open_tv(b,lang,THU%'10:00:00',{'design':{'tpl':tpl},'themeAuto':{'mode':'off'},'hadithPage':{'on':False}}); await until(pg,MAIN); await snap(pg,'tpl_'+tpl,lang); await pg.close()
    # settings on the TV
    pg=await open_tv(b,lang,THU%'10:00:00')
    for cat,js,nm in (('loc','', 'set_loc'),('fri','','set_fri'),('occ',"ACTS.occTab('ram3')",'set_occ'),('azkar',"ACTS.azTab('lib:misc')",'set_lib'),('azkar',"ACTS.azTab('morning')",'set_azkar'),('content',"document.querySelector('[data-k=\"hadithPage.speed\"]').scrollIntoView({block:'center'})",'set_hadith'),('saver','','set_saver'),('tpl','','set_tpl'),('layout','','set_layout')):
      try:
        await settings(pg,cat,js); await snap(pg,nm,lang)
      except Exception as e: print('skip',nm,e)
    await pg.evaluate("closeSettings()"); await pg.close()
    # dashboard (its interface is Arabic)
    if lang=='ar':
      pg=await b.new_page(viewport={'width':1600,'height':1000}); pg._errs=[]
      await pg.goto(DASH); await pg.wait_for_timeout(2500)
      for h,nm in (('#/screens','dash_screens'),('#/screen/73019-26485','dash_editor'),('#/screen/73019-26485/fri','dash_editor_fri'),('#/plans','dash_plans'),('#/backups','dash_backups'),('#/download','dash_download'),('#/admin','dash_admin'),('#/admin/codes','dash_codes')):
        await pg.evaluate(f"location.hash='{h}'"); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=f'{OUT}{nm}.png'); print(nm)
      await pg.close()
      pg=await b.new_page(viewport={'width':1600,'height':1000}); await pg.evaluate("localStorage.clear()") if False else None
      await pg.goto(DASH+'#/login'); await pg.wait_for_timeout(500)
      await pg.evaluate("localStorage.clear(); sessionStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(2500)
      await pg.screenshot(path=f'{OUT}dash_login.png'); print('dash_login'); await pg.close()
    await b.close()
asyncio.run(run(sys.argv[1]))
