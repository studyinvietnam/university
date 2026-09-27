#include<bits/stdc++.h>

using namespace std;
using ll = long long;

int main(){
    freopen("input5.txt", "r", stdin);
	int n, m, k;
	cin >> n >> m >> k;
	int b[n], c[m];
	for(int i = 0; i < n; i++){
	    cin >> b[i];
	}
	for(int i = 0; i < m; i++){
	    cin >> c[i];
	}
	sort(b, b + n);
	sort(c, c + m);
	int i = 0, j = 0;
	int cnt = 0;
	while(i < n && j < m){
		if(abs(b[i] - c[j]) <= k){
		    ++cnt;
		    ++i; ++j;
		}
		else if(b[i] < c[j]) ++i;
		else ++j;
	}
	cout << cnt << endl;
    return 0;
}