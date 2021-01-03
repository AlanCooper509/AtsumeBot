import glob
import pandas as pd

if __name__ == "__main__":
	j_list = glob.glob('*.json')
	for j_file in j_list:
		print(j_file)
		pd.read_json(j_file).T.to_csv(f"{j_file.split('.')[0]}.csv")
