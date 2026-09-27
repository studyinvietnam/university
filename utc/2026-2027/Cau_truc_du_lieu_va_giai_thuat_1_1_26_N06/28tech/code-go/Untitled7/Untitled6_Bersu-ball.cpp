#include<bits/stdc++.h>

using namespace std;
using ll = long long;

int main(){
    freopen("input6.cpp", "r", stdin);
	int n, m, k;
	cin >> n >> m;
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
		if(abs(b[i] - c[j]) <= 1){
		    ++cnt;
		    ++i; ++j;
		}
		else if(b[i] < c[j]) ++i;
		else ++j;
	}
	cout << cnt << endl;
    return 0;
}

//
//#include<bits/stdc++.h>
//
//using namespace std;
//using ll = long long;
//
//int main(){
//    // T?i uu t?c d? nh?p xu?t d? li?u
//    ios_base::sync_with_stdio(false);
//    cin.tie(NULL);
//    
//    int n, m;
//    cin >> n >> m;
//    int b[n], c[m];
//    for(int i = 0; i < n; i++){
//        cin >> b[i];
//    }
//    for(int i = 0; i < m; i++){
//        cin >> c[i];
//    }
//    
//    sort(b, b + n);
//    sort(c, c + m);
//    
//    int i = 0, j = 0;
//    int cnt = 0;
//    while(i < n && j < m){
//        if(abs(b[i] - c[j]) <= 1){
//            ++cnt;
//            ++i; ++j;
//        }
//        else if(b[i] < c[j]) {
//            ++i;
//        }
//        else {
//            ++j;
//        }
//    }
//    cout << cnt << "\n";
//    return 0;
//}
