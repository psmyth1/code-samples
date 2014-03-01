import zipfile
import os

class ZipUtilities:
    def toZip(self, z_file, filename):
        zip_file = zipfile.ZipFile(filename, 'a', zipfile.ZIP_DEFLATED)
        if os.path.isfile(z_file):
            zip_file.write(z_file)
        else:
            self.addFolderToZip(zip_file, z_file)
        zip_file.close()

    def addFolderToZip(self, zip_file, folder): 
        for f in os.listdir(folder):
            full_path = os.path.join(folder, f)
            if os.path.isfile(full_path):
                zip_file.write(full_path)
            elif os.path.isdir(full_path):
                self.addFolderToZip(zip_file, full_path)