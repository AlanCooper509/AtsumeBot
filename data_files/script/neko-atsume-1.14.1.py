#!/usr/bin/env python3
from collections import OrderedDict
from pprint import pprint
from struct import unpack
import io
import os
import json

def read_byte(data):
    return data.read(1)

def read_char(data):
    return unpack('>b', data.read(1))[0]

def read_short(data):
    return unpack('>h', data.read(2))[0]

def read_ushort(data):
    return unpack('>H', data.read(2))[0]

def read_int(data):
    return unpack('>i', data.read(4))[0]

def read_string(data):
    length = read_short(data)
    return unpack(str(length) + 's', data.read(length))[0].decode('shift_jisx0213')

class NekoAtsumeData:
    # Chunks used to compartmentalize data
    entries = []

    # Dates to display snow on the yard
    snow_dates = []

    # Cats!
    cats = OrderedDict()

    # Mysterious tables from the cat entry
    cat_tables = []

    # Goodies, including food and toys
    goodies = OrderedDict()
    goodies2 = OrderedDict()

    goody_configs = OrderedDict()

    # Enumeration of goody classifications
    goody_types = OrderedDict()

    # Mapping of cat poses to corresponding sprite sheets
    cat_pose_sprites = OrderedDict()

    # Mementos awarded by cats
    mementos = OrderedDict()

    # Shop goody listings
    shop_listings = OrderedDict()
    
    def __init__(self, file_path):
        with open(file_path, 'rb') as evt:
            self.parse_header(evt)
            self.parse_entries()
            self.write_output()

    def parse_header(self, evt):
        entries = []
        num_entries = read_char(evt)

        for i in range(num_entries):
            name_data = b''

            data = read_byte(evt)
            while data != b'\x0a':
                name_data += data
                data = read_byte(evt)

            entries.append({
                'name': name_data.decode('shift-jis')
                })

        name_block_end = evt.tell()

        for i in range(num_entries):
            entries[i]['offset'] = read_int(evt) - 1
            entries[i]['size'] = read_ushort(evt)

        for i in range(num_entries):
            file_offset = name_block_end + entries[i]['offset']
            evt.seek(file_offset, os.SEEK_SET)

            flags = []
            num_flags = read_short(evt)
            for j in range(num_flags):
                flags.append(read_short(evt))

            entries[i]['flags'] = flags

            size = entries[i]['size'] - (num_flags * 2 + 2)
            data = evt.read(size)

            entries[i]['data'] = data
    
        self.entries = entries

    def parse_entries(self):
        for entry in self.entries:
            data = io.BytesIO(entry['data'])

            magic = read_short(data)
            assert magic == 0x3e8

            entry_type = read_short(data)

            if entry_type == 0:
                self.parse_init_entry(data)
            elif entry_type == 1:
                self.parse_neko_entry(data)
            elif entry_type == 2:
                self.parse_goodie_config_entry(data)
            elif entry_type == 3:
                self.parse_shop_entry(data)
            elif entry_type == 4:
                self.parse_takara_entry(data)
            elif entry_type == 5:
                self.parse_goods_entry(data)
            elif entry_type == 6:
                self.parse_goods_entry2(data)

            #assert data.read(2) == b'\x00\x01'
            #assert data.tell() == entry['size'] - 4

    def parse_init_entry(self, data):
        while True:
            index = read_char(data)
            if index < 0:
                break

            unk1 = read_string(data)
            unk2 = read_char(data)
            unk3 = read_char(data)

        # coordinate pairs for a rectangle
        while True:
            index = read_char(data)
            if index < 0:
                break

            num_points = read_char(data)

            # [top left, bottom left, bottom right, top right]
            unk1 = [] ##
            for x in range(num_points):
                unk1.append([read_short(data), read_short(data)])

        # katakana character map
        katakana_map = []
        for x in range(90):
            katakana_map.append(read_string(data))

        # sysimg file names
        while True:
            text_block = read_short(data)
            if text_block < 0:
                break

            # upperbound estimate of items
            block_size = read_short(data)

            while True:
                index = read_short(data)
                if index < 0:
                    break

                text = read_string(data)

        # only some text about Mogg "モグニンジン" that doesn't
        # appear to be used anywhere
        while True:
            index = read_short(data)
            if index < 0:
                break

            text = read_string(data)

        while True:
            index = read_char(data)
            if index < 0:
                break
            
            text = read_string(data)

        # only some capitalized ASCII that is entirely discarded
        while True:
            index = read_short(data)
            if index < 0:
                break

            text = read_string(data)

        # text for message boxes
        for x in range(10):
            while True:
                index = read_short(data)
                if index < 0:
                    break
                
                if index & 1 == 0:
                    text_jap = read_string(data)
                    # 0th bit for japanese, 1st bit for english
                    unk1 = read_char(data) ##
                    unk2 = read_short(data) ##
                    text_eng = read_string(data)
                    unk3 = read_short(data) ##
                else:
                    unk4 = read_short(data) ##
                    unk5 = read_char(data) ##
                    unk6 = read_short(data) ##

        # ditto
        while True:
            index = read_short(data)
            if index < 0:
                break
                
            while True:
                index = read_short(data)
                if index < 0:
                    break
                
                if index & 1 == 0:
                    text_jap = read_string(data)
                    unk1 = read_char(data) ##
                    unk2 = read_short(data) ##
                    text_eng = read_string(data)
                    unk3 = read_short(data) ##
                else:
                    unk4 = read_short(data) ##
                    unk5 = read_char(data) ##
                    unk6 = read_short(data) ##

        # dates to display snow
        snow_dates = []
        while True:
            year = read_short(data)
            if year < 0:
                break

            month = read_short(data)
            day = read_short(data)

            snow_dates.append([year, month, day])

        self.snow_dates = snow_dates

    def parse_neko_entry(self, data):
        num_interests = 0
        idx_interests = []
        while True:
            index = read_short(data)
            if index < 0:
                break
                        
            num_interests += 1
            idx_interests.append(index)

        # table 1 - appearance multiplier when there is snow
        #       2 -                            month is april or may
        #       3 -                                     july or august
        #       4 - ?? stacks with table 7 when month is july or august
        #       5 -                            month is september or october
        #       6 -                                     december or jan or feb
        #       7 - initial appearance factor
        cat_tables = []
        for x in range(9):
            unk1a = []
            for y in range(num_interests):
                unk1a.append(read_short(data))
            cat_tables.append(unk1a)

        counter2 = 0
        while True:
            index = read_short(data)
            if index < 0:
                break

            counter2 += 1

        assert num_interests == counter2

        cats = OrderedDict()
        while True:
            index = read_short(data)

            if index < 0:
                break
            
            name_jap = read_string(data)
            appearance_jap = read_string(data)
            personality_jap = read_string(data)

            regular = index < 100
            if regular:
                bin_name = read_string(data)
            else:
                special_index = read_short(data)

            # index for img_face.bin
            cat_index = read_short(data)

            name_eng = read_string(data)
            appearance_eng = read_string(data)
            personality_eng = read_string(data)

            power_level = read_short(data)
            
            memento_id = read_short(data) - 1

            # factor to determine fish given upon leaving
            fish_gift_factor = read_short(data)

            # factor applied to all seasonal goody factors
            seasonal_modifier_factor = read_short(data)

            # interests a cat has in a given food
            # 0 Thrifty Bitz    1 Frisky Bitz       2 Ritzy Bitz
            # 3 Sashimi         4 Deluxe Tuna Bitz  5 Bonito Bitz
            food_interests = []
            for x in range(6):
                food_interests.append(read_short(data))

            # unknown interests
            unk_interests =[]
            for x in range(3):
                unk_interests.append(read_short(data))

            # interests a cat has with a given goody [config]
            goody_interests = []
            for x in range(num_interests):
                goody_interests.append(read_short(data))

            # for introducing cats but keeping them out of the game
            available = not (index >= 130 and index < 140)

            cats[index] = {
                'name': name_eng,
                'appearance': appearance_eng,
                'personality': personality_eng,
                'name_jap': name_jap,
                'appearance_jap': appearance_jap,
                'personality_jap': personality_jap,
                'power_level': power_level,
                'memento_id': memento_id,
                'regular': regular,
                'available': available,
                'cat_index': cat_index,
                'fish_gift_factor': fish_gift_factor,
                'seasonal_modifier_factor': seasonal_modifier_factor,
                'food_interests': food_interests,
                'unk_interests': unk_interests,
                'goody_interests': goody_interests,
                }

            if regular:
                # img_neko_XX name for cat images
                cats[index]['file_name'] = bin_name
            else:
                # index for img_neko_special.bin
                cats[index]['special_index'] = special_index

            # ignoring this for now
            unk = read_short(data) ##

        self.cats = cats
        self.cat_tables = cat_tables
        self.idx_interests = idx_interests

    def parse_goods_entry(self, data):
        goodies = OrderedDict()
        while True:
            index = read_short(data)
            if index < 0:
                break

            name_jap = read_string(data)
            
            unk1 = read_short(data) ##
            
            shop_desc_jap = read_string(data)
            goodies_desc_jap = read_string(data)
            
            food = read_char(data)
            
            unk2 = read_short(data) ##

            # all three tend to be very similar
            unk3 = read_short(data) ##
            unk4 = read_short(data) ##
            unk5 = read_short(data) ##

            # 0 - small spot, 1 - large spot, 3 - food spot
            spot = read_char(data)
            
            goody_type = read_char(data)

            name_eng = read_string(data)
            shop_desc_eng = read_string(data)
            goodies_desc_eng = read_string(data)

            # this is 1 for Burger Cushion, Arabesque Blanket, and Cowboy Hat
            # otherwise it is 0
            unk7 = read_char(data) ##

            # depends on events
            unk8 = [] ##
            for x in range(14):
                unk8.append(read_short(data))

            goodies[index] = {
                'idx': index,
                'name': name_eng,
                'name_jap': name_jap,
                'shop_desc': shop_desc_eng,
                'goodies_desc': goodies_desc_eng,
                'shop_desc_jap': shop_desc_jap,
                'goodies_desc_jap': goodies_desc_jap,
                'food': food,
                'spot': spot,
                'type': goody_type,
                'group': 1,
                
                'unk1': unk1,
                'unk2': unk2,
                'unk3': unk3,
                'unk4': unk4,
                'unk5': unk5,
                'spot': spot,
                'unk7': unk7,
                'unk8': unk8,
                }

        self.goodies = goodies

    def parse_goods_entry2(self, data):
        goodies = OrderedDict()
        while True:
            index = read_short(data)
            if index < 0:
                break

            name_jap = read_string(data)

            unk1 = read_short(data)  ##

            shop_desc_jap = read_string(data)
            goodies_desc_jap = read_string(data)

            food = read_char(data)

            unk2 = read_short(data)  ##

            # all three tend to be very similar
            unk3 = read_short(data)  ##
            unk4 = read_short(data)  ##
            unk5 = read_short(data)  ##

            # 0 - small spot, 1 - large spot, 3 - food spot
            spot = read_char(data)

            goody_type = read_char(data)

            name_eng = read_string(data)
            shop_desc_eng = read_string(data)
            goodies_desc_eng = read_string(data)

            # this is 1 for Burger Cushion, Arabesque Blanket, and Cowboy Hat
            # otherwise it is 0
            unk7 = read_char(data)  ##

            # depends on events
            unk8 = []  ##
            for x in range(14):
                unk8.append(read_short(data))

            goodies[index] = {
                'idx': index,
                'name': name_eng,
                'name_jap': name_jap,
                'shop_desc': shop_desc_eng,
                'goodies_desc': goodies_desc_eng,
                'shop_desc_jap': shop_desc_jap,
                'goodies_desc_jap': goodies_desc_jap,
                'food': food,
                'spot': spot,
                'type': goody_type,
                'group': 2,

                'unk1': unk1,
                'unk2': unk2,
                'unk3': unk3,
                'unk4': unk4,
                'unk5': unk5,
                'spot': spot,
                'unk7': unk7,
                'unk8': unk8,
            }

        self.goodies2 = goodies

    def parse_goodie_config_entry(self, data):
        # goody-cat configurations
        goody_configs = OrderedDict()
        while True:
            index = read_short(data)
            if index < 0:
                break

            goody_id = read_short(data)
            goody_config_id = read_short(data)
            unk2 = read_short(data)

            goody_config = []
            for i in range(6):
                pose = read_short(data)
                position = read_short(data)
                goody_config.append([pose, position % 10, position / 10])


            # if goody_id not in goodies:
            #    goodies[goody_id] = {'configs': {}}

            # goodies[goody_id]['configs'][goody_config_id] = goody_config

            goody_configs[index] = {
                'idx': index,
                'goody': goody_id,
                'config_num': goody_config_id,
                'config': goody_config,
                'unk2': unk2
            }

        # cat pose to sprite sheet mapping
        cat_pose_sprites = OrderedDict()
        while True:
            index = read_short(data)
            if index < 0:
                break

            spritesheet_num = read_short(data)

            cat_pose_sprites[index] = spritesheet_num

        # goody type definitions
        goody_types = OrderedDict()
        while True:
            index = read_short(data)
            if index < 0:
                break

            name_jap = read_string(data)

            unk1 = read_short(data)  ##

            type_id = read_short(data)
            assert index == type_id

            goody_types[index] = {
                'name_jap': name_jap,

                'unk1': unk1
            }

        self.goody_configs = goody_configs
        self.cat_pose_sprites = cat_pose_sprites
        self.goody_types = goody_types

    def parse_shop_entry(self, data):
        shop_listings = OrderedDict()
        while True:
            index = read_short(data)
            if index < 0 or index > 250:
                break

            amount = read_short(data)
            gold_fish = read_char(data) == 1
            price = read_short(data)

            shop_listings[index] = {
                'amount': amount,
                'gold_fish': gold_fish,
                'price': price,
                }

        self.shop_listings = shop_listings

    def parse_takara_entry(self, data):
        mementos = OrderedDict()
        while True:
            index = read_short(data)
            if index < 0:
                break
            
            memento_id = index - 1

            jap_name = read_string(data)
            jap_desc = read_string(data)

            memento_id2 = read_short(data)
            #assert memento_id == memento_id2
            
            eng_name = read_string(data)
            eng_desc = read_string(data)

            mementos[memento_id] = {
                'name': eng_name,
                'name_jap': jap_name,
                'desc': eng_desc,
                'desc_jap': jap_desc,
                }

        self.mementos = mementos

    def write_output(self):
        logfile = open('cats.txt', 'w')
        #pprint(self.cats, logfile,compact=True,indent=0)
        json.dump(self.cats,logfile)
        logfile.close

        logfile = open('goodiesconfig.txt', 'w')
        json.dump(self.goody_configs, logfile)
        logfile.close

        logfile = open('goodies.txt', 'w')
        self.goodies.update(self.goodies2)
        self.goodies = OrderedDict(sorted(self.goodies.items()))
        #pprint(self.goodies, logfile,compact=True)
        json.dump(self.goodies, logfile)
        logfile.close

        logfile = open('idxinterests.txt', 'w')
        json.dump(self.idx_interests, logfile)
        logfile.close

        logfile = open('shoplistings.txt', 'w')
        json.dump(self.shop_listings, logfile)
        logfile.close

        logfile = open('mementos.txt', 'w')
        json.dump(self.mementos, logfile)
        logfile.close

if __name__ == '__main__':
    data = NekoAtsumeData('evt00_data.evt')