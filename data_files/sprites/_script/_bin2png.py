#!/usr/bin/env python3
import sys
import binascii
import glob
import os

png_header = ["89","50","4e","47","0d","0a","1a","0a"]

#function created by /u/nofunallowed98765 from reddit.
def createPNG(bin_file):
    data = []
    img = b""
    with open(bin_file, "rb") as f:
        b = f.read(1)
        while b:
            if b == binascii.unhexlify(png_header[0]):
                header = f.read(7)
                if header == binascii.unhexlify("".join(png_header[1:])):
                    data.append(img)
                    img = b""
                    print("header found!")
                f.seek(-7, 1)
            img = img + b
            b = f.read(1)
      
    data = data[1:]
    if not os.path.exists(bin_file.split('.')[0]):
        os.makedirs(bin_file.split('.')[0])
    for i, val in enumerate(data):
        with open(f"{bin_file.split('.')[0]}/{bin_file.split('.')[0]}-{str(i)}.png", "wb") as f:
            f.write(bytes(val))

if __name__ == "__main__":
    bin_list = glob.glob('*.bin')
    print(bin_list)
    for img in bin_list:
        createPNG(img)