#include<bits/stdc++.h>

using namespace std;
using ll = long long;

int main(){
	freopen("input1.cpp", "r", stdin);
	ios::sync_with_stdio(false);
	cin.tie(nullptr);
	int n, s; cin >> n >> s;
	pair<int, int> a[n];
	for(int i = 0; i < n; i++) cin >> a[i].first >> a[i].second;
	sort(a, a + n);
	for(auto it : a){
	    if(it.first >= s){
	        cout << "NO\n"; return 0;
	    }
	    s += it.second;
	}
	cout << "YES\n";
	return 0;
}