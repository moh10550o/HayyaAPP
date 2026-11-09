import asyncio
from playwright.async_api import async_playwright
DASH='file:///home/claude/hayya-tv/demo/dashboard-demo.html'
OUT='/home/claude/deck/shots/'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    pg=await b.new_page(viewport={'width':1120,'height':700}, device_scale_factor=1.6)
    await pg.goto(DASH); await pg.wait_for_timeout(2500)
    for h,nm in (('#/screens','dash_screens'),('#/plans','dash_plans'),('#/backups','dash_backups'),('#/download','dash_download'),('#/admin/codes','dash_codes')):
      await pg.evaluate(f"location.hash='{h}'"); await pg.wait_for_timeout(2500)
      await pg.screenshot(path=f'{OUT}{nm}.png'); print(nm)
    pg=await b.new_page(viewport={'width':1600,'height':1000}); await pg.goto(DASH); await pg.wait_for_timeout(2500)
    await pg.evaluate("location.hash='#/screen/73019-26485'"); await pg.wait_for_timeout(3000); await pg.screenshot(path=f'{OUT}dash_editor.png')
    await b.close()
asyncio.run(main())
