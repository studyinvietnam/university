#include<bits/stdc++.h>

using namespace std;
using ll = long long;

int mark[1000005];

bool cmp(pair<int, int> a, pair<int, int> b){
    if(a.second != b.second)
        return a.second > b.second;
    return a.first < b.first;
}

bool cmp2(pair<int, int> a, pair<int, int> b){
	return a.second > b.second;
}

int main(){
	freopen("input8-1.cpp", "r", stdin);
//	freopen("input8-2.cpp", "r", stdin);

//	Output 01
//	4 4 4 10 10 1 2 3 6 8
//	4 4 4 10 10 6 8 3 2 1

//	Output 02
//	2 2 3 3 6 6 1 5 7 10
//	2 2 6 6 3 3 5 7 1 10
	
	map<int, int> mp;
	int n; cin >> n;
	int a[n];
	for(int i = 0; i < n; i++){
		cin >> a[i];
		mp[a[i]]++;
	}
	
	vector<pair<int, int>> v;
	for(auto it : mp) v.push_back(it);
	sort(v.begin(), v.end(), cmp);
	for(auto it : v){
		for(int j = 0; j < it.second; j++){
			cout << it.first << " ";
		}
	}
	cout << endl;
	
	vector<pair<int, int>> v1;
	for(int x : a){
		if(mp[x] != 0){
			v1.push_back({x, mp[x]});
			mp[x] = 0;
		}
	}
	stable_sort(v1.begin(), v1.end(), cmp2);
	for(auto it1 : v1){
		for(int j = 0; j < it1.second; j++){
			cout << it1.first << " ";
		}
	}
	return 0;
}