import glob
import pandas as pd

if __name__ == "__main__":
    j_list = glob.glob('*.json')
    for j_file in j_list:
        pd.read_json(j_file).to_csv(f"{j_file.split('.')[0]}.csv")