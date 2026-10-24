# Usage: python3 -I text.py <html file> [start-marker] [nchars]  -> visible text
import re,html,sys
s=open(sys.argv[1],errors="replace").read()
t=re.sub(r"<script.*?</script>|<style.*?</style>|<nav.*?</nav>|<header.*?</header>|<footer.*?</footer>","",s,flags=re.S|re.I)
t=html.unescape(re.sub(r"<[^>]+>"," ",t)); t=re.sub(r"[ \t\r\f\v]+"," ",t); t=re.sub(r"\n\s*\n+","\n",t)
m=sys.argv[2] if len(sys.argv)>2 else ""
i=t.find(m) if m else 0
print(t[max(i,0):max(i,0)+int(sys.argv[3]) if len(sys.argv)>3 else None])
