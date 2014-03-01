include("htmlDump.js")

try{
  go("https://mcphedge.backstopsolutions.com/backstop/")
  enter("User Name","rserch")
  enter("Password","r3@$0@p")
  click("Log In button")
  sleep(6.0)
} catch(e){
}

pg_file = read("C:\\Program Files\\MCP Report Manager\\peer_groups.dat")
var lines = pg_file.split("\n"), words;

for(var line = 0; line < lines.length; line++){
  words = lines[line].split(":");
  pg_name = words[0]
  words[1] = words[1].strip(" ")
  pg_ids = words[1].split(" ")
  createPeerGroup(pg_name,pg_ids)
}

click(new XPath("/HTML[1]/BODY[1]/DIV[3]/DIV[1]/DIV[3]/UL[1]/LI[5]/A[1]"))

function createPeerGroup(pg_name,pg_ids){
  go("https://mcphedge.backstopsolutions.com/backstop/fundaccounting/portfolio/peergroup/ManagePeerGroup.do?ACTION=new")
  enter(new XPath("/HTML[1]/BODY[1]/DIV[8]/DIV[1]/FORM[1]/INPUT[3]"), pg_name)
  selectFunds(pg_ids)
  click(new XPath("/HTML[1]/BODY[1]/DIV[8]/DIV[1]/FORM[1]/DIV[1]/BUTTON[1]"))
  click("Peer Groups")
}

function selectFunds(f_ids){
  file = dump()
  file = file.split("Hedge Funds in Peer Group")
  file = file[1].split("</select>")
  file = file[0]
  file = file.split("<option value=")
  file = file.slice(1,file.length)
  for(var line = 0; line < file.length; line++){
    entry = file[line]
    for(var id_num = 0; id_num < f_ids.length; id_num++){
      id_str = f_ids[id_num] + ""

      pos = search(entry,id_str,0)
      if(pos != -1){
        pick(new XPath("/HTML[1]/BODY[1]/DIV[8]/DIV[1]/FORM[1]/SELECT[1]/OPTION[" + (line+1) + "]"))      
      }
    }
  }
}
function search(src, str, startPos){  
  var match = 0, pos = 0;
  src += "";
  str += "";

  for(pos = startPos; match < str.length && pos < src.length; pos++){
    if(src.charAt(pos) == str.charAt(match)){
      match++;
    }
    else{
      match = 0;
    }
  }
  if(match != str.length)
    pos = -1;
  return pos;    
}










