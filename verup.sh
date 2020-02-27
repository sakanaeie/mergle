sed -i "s/mergle_build_version=[0-9]*/mergle_build_version=`git log --oneline | wc -l`/" client/index.html
