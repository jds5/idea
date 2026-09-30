// No dependencies. Serve this prototype only, on the loopback interface.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = { '/': ['index.html','text/html'], '/index.html':['index.html','text/html'], '/styles.css':['styles.css','text/css'], '/app.js':['app.js','text/javascript'], '/domain.js':['domain.js','text/javascript'], '/mark.svg':['mark.svg','image/svg+xml'], '/landscape.svg':['landscape.svg','image/svg+xml'] };
const port = Number(process.env.DAYWARD_PORT || 4173);
const server = http.createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  const pathname = new URL(req.url,'http://localhost').pathname;
  const file = files[pathname];
  if(!file){res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');return;}
  fs.readFile(path.join(__dirname,file[0]),(err,data)=>{
    if(err){res.writeHead(500);res.end('Could not load prototype');return;}
    res.writeHead(200,{'Content-Type':file[1]+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:data);
  });
});
server.on('error',err=>{console.error(`Preview server: ${err.message}`);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Dayward preview: http://127.0.0.1:${port}`));
