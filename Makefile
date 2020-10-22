# TODO differentiate WSL Linux and Linux see:
# https://stackoverflow.com/questions/38086185/how-to-check-if-a-program-is-run-in-bash-on-ubuntu-on-windows-and-not-just-plain
UNAME := $(shell uname -s)
SYSTEM = Linux

ifeq ($(UNAME),Linux)
	ifeq ($(WSL),1)
		SYSTEM = 'WSL'
	endif
	else
	ifeq ($(UNAME),Darwin)
		SYSTEM = 'Mac'
	else
		SYSTEM = 'Windows'
	endif
endif

info:
	@echo $(UNAME), $(WSL), $(SYSTEM), $(DOCKER_HOST_IP)

install_yarn:
ifeq (,$(shell which yarn))
	npm -g install yarn
endif

install_js:
	cd ingest && yarn && cd ..

#This expects a command line argument defining the data directory such as make load_share_data DATADIR=../data/EarthArXiv
load_share_data:
	cd ingest && ts-node loadShareData.ts && cd ..

fetch_share_data:
	cd ingest && ts-node fetchShareData.ts && cd ..

install: install_yarn install_js
	echo 'Installing'