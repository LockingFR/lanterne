"""Génère une fausse sauvegarde Signal v2 (tests/out/SignalBackups) et sa clé (tests/out/aep.txt).
Aucune donnée réelle : sert à vérifier que l'outil déchiffre correctement."""
import os, gzip, hmac, hashlib, secrets, shutil
HERE=os.path.dirname(os.path.abspath(__file__)); OUT=os.path.join(HERE,'out'); os.makedirs(OUT,exist_ok=True); os.chdir(OUT)
from cryptography.hazmat.primitives import hashes, padding
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
def hk(ikm,l,info): return HKDF(algorithm=hashes.SHA256(),length=l,salt=None,info=info).derive(ikm)
def vi(n):
    o=bytearray()
    while True:
        b=n&0x7f; n>>=7; o.append(b|(0x80 if n else 0))
        if not n: return bytes(o)
def fv(f,v): return vi(f<<3)+vi(v)
def fb(f,b):
    if isinstance(b,str): b=b.encode()
    return vi((f<<3)|2)+vi(len(b))+b
def cbc(key,pt):
    p=padding.PKCS7(128).padder(); pt=p.update(pt)+p.finalize(); iv=os.urandom(16)
    e=Cipher(algorithms.AES(key),modes.CBC(iv)).encryptor(); return iv, e.update(pt)+e.finalize()
aep=''.join(secrets.choice('abcdefghijklmnopqrstuvwxyz0123456789') for _ in range(64))
bk=hk(aep.encode(),32,b"20240801_SIGNAL_BACKUP_KEY"); mk=hk(bk,32,b"20241011_SIGNAL_LOCAL_BACKUP_METADATA_KEY")
bid=os.urandom(16); iv=os.urandom(12)
ct=Cipher(algorithms.AES(mk),modes.CTR(iv+b"\0\0\0\0")).encryptor().update(bid)
meta=fv(1,1)+fb(2,fb(1,iv)+fb(2,ct))
k=hk(bk,64,b"20241007_SIGNAL_BACKUP_ENCRYPT_MESSAGE_BACKUP:"+bid); hkey,akey=k[:32],k[32:]
# media
img=open(os.path.join(HERE,'px.png'),'rb').read()
lk=os.urandom(64); ph=hashlib.sha256(img).digest()
padded=img+b'\0'*(200-len(img)%200)
miv,mct=cbc(lk[:32],padded); blob=miv+mct; blob+=hmac.new(lk[32:],blob,hashlib.sha256).digest()
name=hashlib.sha256(ph+lk).hexdigest()
root='SignalBackups'; shutil.rmtree(root,ignore_errors=True)
os.makedirs(f'{root}/files/{name[:2]}'); open(f'{root}/files/{name[:2]}/{name}','wb').write(blob)
aci=os.urandom(16)
frames=[fv(1,1)+fv(2,1764000000000)]
F=lambda fno,msg: fb(fno,msg)
frames.append(F(2,fv(1,1)+fb(5,b'')))
frames.append(F(2,fv(1,2)+fb(2,fb(1,aci)+fb(11,'Zoé')+fb(12,'Martin'))))
frames.append(F(2,fv(1,3)+fb(3,fb(5,fb(2,fb(1,'Famille'))))))
frames.append(F(3,fv(1,20)+fv(2,2)))
frames.append(F(3,fv(1,21)+fv(2,3)))
def item(chat,author,ts,out,sm): return F(4,fv(1,chat)+fv(2,author)+fv(3,ts)+fb(9 if out else 8,b'')+fb(11,sm))
frames.append(item(20,2,1763900000000,False,fb(2,fb(1,'Salut ça va ? 🙂'))))
frames.append(item(20,1,1763900100000,True,fb(2,fb(1,'Oui ! Voici la photo'))+fb(3,fb(1,fb(4,'image/png')+fb(7,'px.png')+fb(13,fv(3,len(img))+fb(9,lk)+fb(10,ph))))))
frames.append(item(21,2,1763900200000,False,fb(2,fb(1,'Coucou ￼')+fb(2,fv(1,7)+fv(2,1)+fb(3,aci)))))
pt=b''.join(vi(len(f))+f for f in frames)
iv2,c2=cbc(akey,gzip.compress(pt)); body=iv2+c2; main=body+hmac.new(hkey,body,hashlib.sha256).digest()
snap=f'{root}/signal-backup-2026-11-24-08-00-00'; os.makedirs(snap)
open(f'{snap}/main','wb').write(main); open(f'{snap}/metadata','wb').write(meta); open(f'{snap}/files','wb').write(b'')
disp=' '.join(aep.upper().replace('O','#').replace('0','=')[i:i+4] for i in range(0,64,4))
open('aep.txt','w').write(disp); print(disp)
