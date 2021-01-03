#!/usr/bin/env python3
from collections import OrderedDict
from pprint import pprint
from struct import unpack
import pandas as pd
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
    entries = []
    snow_dates = []
    cats = {}
    index_interests = []
    goody_configs = {}
    cat_pose_sprites = {}
    shop_listings = {}
    wallpapers = {}
    mementos = {}
    goodies1 = {}
    goodies2 = {}

    def __init__(self, input_file):
        with open(input_file, 'rb') as evt:
            self.entries = self.parse_header(evt, log = True)
        self.parse_entries()
        self.write_output()

    def parse_header(self, evt, log = False):
        entries = []
        num_entries = read_char(evt)

        # name fields
        for i in range(num_entries):
            name_data = b''
            data = read_byte(evt)
            while data != b'\x0a':
                name_data += data
                data = read_byte(evt)
            entries.append({
                'name': name_data.decode('shift-jisx0213')
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
            
        if log:
            for entry in entries:
                print(entry)

        return entries

    def parse_entries(self, log = False):
        for entry in self.entries:
            data = io.BytesIO(entry['data'])

            magic = read_short(data)
            assert magic == 0x03e8

            entry_type = read_short(data)
            if log:
                print(f"Next Entry: {entry_type}")

            if entry_type == 0:
                self.snow_dates = self.parse_init_entry(data, log = False)
            elif entry_type == 1:
                self.cats, self.index_interests = self.parse_neko_entry(data)
            elif entry_type == 2:
                self.goody_configs, self.cat_pose_sprites = self.parse_goods_config_entry(data)
            elif entry_type == 3:
                self.shop_listings, self.wallpapers = self.parse_shop_entry(data)
            elif entry_type == 4:
                self.mementos = self.parse_takara_entry(data)
            elif entry_type == 5:
                self.goodies1 = self.parse_goods_entry(data, group = 1)
            elif entry_type == 6:
                self.goodies2 = self.parse_goods_entry(data, group = 2)

            assert data.read(2) == b'\x00\x01'
            assert data.tell() == entry['size'] - 4

    # =======================================
    # HELPER FUNCTIONS
    # =======================================
    def parse_init_entry(self, data, log = False):
        ''' returns: snow dates '''
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

        # help text for message boxes
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
                    if log:
                        print(text_eng)
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
                    if log:
                        print(text_eng)
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

        return snow_dates

    def parse_neko_entry(self, data):
        # unique values (incrementing from 0), ids for below
        idx_interests = []
        while True:
            index = read_short(data)
            if index < 0:
                break
            idx_interests.append(index)

        # ** comment not updated/verified since the original 1.5.0.py
        # table 1 - appearance multiplier when there is snow
        #       2 -                            month is april or may
        #       3 -                                     july or august
        #       4 - ?? stacks with table 7 when month is july or august
        #       5 -                            month is september or october
        #       6 -                                     december or jan or feb
        #       7 - initial appearance factor
        #       8 - ??? ** new since 1.5.0.py
        #       9 - ??? ** new since 1.5.0.py
        cat_tables = []
        for x in range(9):
            unk1a = []
            for y in range(len(idx_interests)):
                unk1a.append(read_short(data))
            cat_tables.append(unk1a)

        unk_bools = []
        while True:
            index = read_short(data)
            if index < 0:
                break
            unk_bools.append(index)

        assert len(idx_interests) == len(unk_bools)

        cats = OrderedDict()
        while True:
            index = read_short(data) # cat index
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
            img_face = read_short(data)

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
                # 0 Thrifty Bitz
                # 1 Frisky Bitz
                # 2 Ritzy Bitz
                # 3 Sashimi
                # 4 Deluxe Tuna Bitz
                # 5 Bonito Bitz
                # 6 ** Sashimi Boat?
            food_interests = []
            for x in range(7):
                food_interests.append(read_short(data))

            # unknown interests
            unk_interests =[]
            for x in range(3):
                unk_interests.append(read_short(data))

            # interests a cat has with a given goody
            # (using idx_interests as keys for [goody_configs])
            goody_interests = []
            for x in range(len(idx_interests)):
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
                'img_face': img_face,
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

        # some sort of correlation matrix (65 x 66) involving cats' ids
        # columns exclude 42 Maple, 43 (Caramel); include 130 (Kitty Hawks)?
        col_names = []
        while True:
            # 0, 1, ..., 41, then 100, 101, ..., 119, 130, 120, 121
            index = read_short(data)
            if index < 0:
                break
            col_names.append(index)
        table_vals = {}
        # rows include all in-game cats, exclude 130 (Kitty Hawks)
        while True:
            index = read_short(data)
            if index == -1:
                break
            table_vals[index] = []
            for x in range(len(col_names)):
                table_vals[index].append(read_short(data))
        # outputing as a csv
        df = pd.DataFrame(table_vals).T
        df.columns = col_names
        correlation_csv = df.to_csv()

        # return types
            # idx_interests     list(313)
            # cat_tables        2Dlist(9 outer, 313 inner)
            # unk_bools         list(313)
            # cats              dict(67 keys, 18 properties each)
            # correlation_csv   csv string, represents 66 rows, 65 cols
        return cats, idx_interests

    def parse_goods_config_entry(self, data):
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

            goody_configs[index] = {
                'goody_id': goody_id,
                'config_num': goody_config_id,
                'unk2': unk2,
                'config': goody_config
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

        # return types
            # goody_configs{}:    index, goody_id, config_num, unk2, config[6]
            # cat_pose_sprites{}: goody_configs "pose" mappings to img_neko_xx indices
            # goody_types{}:      categories 1-10 in japanese (unused)
        return (goody_configs, cat_pose_sprites)

    def parse_shop_entry(self, data):
        shop_listings = OrderedDict()
        while True:
            index = read_short(data)
            if index < 0:
                break

            amount = read_short(data)
            gold_fish = read_char(data) == 1
            price = read_short(data)

            shop_listings[index] = {
                'quantity': amount,
                'gold_fish': gold_fish,
                'price': price,
                }

        # wallpaper requirements
        wallpapers = {}
        while True:
            id = read_short(data)
            if(id < 0):
                break
            unk_id = read_short(data)
            name = read_string(data) # files in drawable-nodpi-v4

            # numbers represent cat ids
            cat_ids = []
            visits = None
            unk1 = None
            while True:
                index = read_short(data)
                if index < 0:
                    break
                cat_ids.append(index)
            if len(cat_ids) > 0:
                visits = read_short(data)
                unk1 = read_short(data)

            # numbers represent cat ids, not memento ids
            cat_mementos = []
            while True:
                index = read_short(data)
                if index < 0:
                    break
                cat_mementos.append(index)

            unk2 = read_short(data)
            gold = read_short(data)
            price = read_short(data)

            unk3 = read_short(data)
            unk4 = read_short(data)
            wallpapers[id] = {
                "game_id":      unk_id,
                "name":         name,
                "cats":         cat_ids,
                "visits":       visits,
                "unk1":         unk1,
                "cat_mementos": cat_mementos,
                "unk2":         unk2,
                "gold_fish":    gold == 1,
                "price":        price,
                "unk3":         unk3,
                "unk4":         unk4
            }
        
        # return types
            # shop_listings{}:  goody id mapped to quantity, gold_fish, price
            # wallpapers{}:     wallpaper id mapped to properties for unlocking
        return (shop_listings, wallpapers)

    def parse_takara_entry(self, data):
        mementos = OrderedDict()
        while True:
            index = read_short(data)
            if index < 0:
                break
            
            memento_id = index - 1

            jap_name = read_string(data)
            jap_desc = read_string(data)

            # same as memento_id except 63+ are offset by +3
            memento_id2 = read_short(data)
            
            eng_name = read_string(data)
            eng_desc = read_string(data)

            mementos[memento_id] = {
                'name': eng_name,
                'name_jap': jap_name,
                'desc': eng_desc,
                'desc_jap': jap_desc,
                }

        # same as memento_id2 (both unused)
        len = read_short(data)
        for i in range(len):
            memento_id3 = read_short(data)

        return mementos

    def parse_goods_entry(self, data, group):
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
            unk6 = read_char(data)  ##

            # depends on events
            unk7 = []  ##
            for x in range(14):
                unk7.append(read_short(data))

            goodies[index] = {
                'name': name_eng,
                'name_jap': name_jap,
                'shop_desc': shop_desc_eng,
                'goodies_desc': goodies_desc_eng,
                'shop_desc_jap': shop_desc_jap,
                'goodies_desc_jap': goodies_desc_jap,
                'food': food,
                'spot': spot,
                'type': goody_type,
                'group': group,

                'unk1': unk1,
                'unk2': unk2,
                'unk3': unk3,
                'unk4': unk4,
                'unk5': unk5,
                'unk6': unk6,
                'unk7': unk7,
            }

        return goodies

    def write_output(self):
        with open('snow_dates.json', 'w') as logfile:
            json.dump(self.snow_dates,logfile)

        with open('cats.json', 'w') as logfile:
            json.dump(self.cats,logfile)

        with open('cats_interest_index_to_goody_config.json', 'w') as logfile:
            json.dump(self.index_interests,logfile)

        with open('goody_configs.json', 'w') as logfile:
            json.dump(self.goody_configs, logfile)

        with open('goody_config_pose_to_cat_sprite_map.json', 'w') as logfile:
            json.dump(self.cat_pose_sprites, logfile)

        with open('shop_listings.json', 'w') as logfile:
            json.dump(self.shop_listings, logfile)

        with open('wallpapers.json', 'w') as logfile:
            json.dump(self.wallpapers, logfile)

        with open('mementos.json', 'w') as logfile:
            json.dump(self.mementos, logfile)

        self.goodies1.update(self.goodies2)
        self.goodies1 = OrderedDict(sorted(self.goodies1.items()))
        with open('goodies.json', 'w') as logfile:
            json.dump(self.goodies1, logfile)

if __name__ == '__main__':
    NekoAtsumeData('evt00_data.evt')
