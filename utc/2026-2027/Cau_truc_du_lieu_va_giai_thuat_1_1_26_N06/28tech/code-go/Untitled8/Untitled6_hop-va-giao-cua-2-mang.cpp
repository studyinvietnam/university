#include<bits/stdc++.h>

using namespace std;
using ll = long long;

int main(){
	freopen("input6.cpp", "r", stdin);
//	1 2 3
//	1 2 3 5 9
	int n, m; cin >> n >> m;
	map<int, int> hop, giao;  // map<int, int> hop;
	for(int i = 0; i < n; i++){
		int x; cin >> x;
		hop.insert({x, 1});  // hop.insert(x);
		giao[x] = 1;
	}
	for(int i = 0; i < m; i++){
		int x; cin >> x;
		hop.insert({x, 1});  // hop.insert(x);
		if(giao[x] == 1) giao[x] = 2;
	}
	for(auto it : giao){
		if(it.second == 2) cout << it.first << " ";
	}
	cout << endl;
	for(auto it : hop) cout << it.first << " "; 
	// for(int x : hop) cout << x << " ";
	return 0;
}