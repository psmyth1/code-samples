import os
from libs.utils.ZipUtilities import ZipUtilities
import cPickle

version_file = open("current_version.dat")
ver_str = version_file.read()
version_file.close()

copy_over = False

if os.access("../../../../Packages/mcp_rep_man/current_version.dat",os.F_OK):
    version_file2 = open("../../../../Packages/mcp_rep_man/current_version.dat")
    ver_str2 = version_file2.read()
    version_file2.close()
    if float(ver_str) > float(ver_str2):
        os.remove("../../../../Packages/mcp_rep_man/current_version.dat")
        copy_over = True
else:
    copy_over = True
    
if copy_over:
    version_file2 = open("../../../../Packages/mcp_rep_man/current_version.dat",'w')
    version_file2.write(ver_str)
    version_file2.close()

ref_file = open("refresh_list.txt")
ref_str = ref_file.read()
ref_file.close()

refresh_list = []
ref_str = ref_str.split("\n")
for r in ref_str:
    r = r.split("::")
    if len(r) == 2:
        refresh_list.append(r[0])

os.chdir("./mcp_rep_dist/main/")

ref_list_file = open("ref_list.dat",'w')
cPickle.dump(refresh_list,ref_list_file)
ref_list_file.close()

ref_name = "../../../../../../Packages/mcp_rep_man/ref_list_" + ver_str + ".dat"
ref_list_file = open(ref_name,'w')
cPickle.dump(refresh_list,ref_list_file)
ref_list_file.close()

zip_name = "../../../../../../Packages/mcp_rep_man/package" + ver_str + ".zip"
if os.access(zip_name, os.F_OK):
    os.remove(zip_name)
util = ZipUtilities()

f_names = os.listdir(".")
cd = os.getcwd()           

for f in f_names:
    if f in refresh_list:
        util.toZip(f,zip_name)
    elif os.path.isdir(cd+"/"+f):
            f_names2 = os.listdir(cd+"/"+f)
            for f2 in f_names2:
                tmp = f + "/" + f2
                if tmp in refresh_list:
                    util.toZip(f + "/" + f2,zip_name)       