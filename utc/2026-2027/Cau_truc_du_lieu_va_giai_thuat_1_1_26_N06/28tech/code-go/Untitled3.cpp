#include <bits/stdc++.h>
using namespace std;
using ll = long long;

string array_to_string(char a[], int n){
	//code here
	string s = "";
	for(int i = 0; i < n; i++){
		s += a[i];
	}
	return s;
}

string inThuong(string s){
		for (char &x : s) {
		    x = tolower(x);
		}
		return s;
}
string inHoa(string s){
		for (char &x : s) {
		    x = toupper(x);
		}
		return s;
}

string lapChuoi(int n, string x) {
    string s;
    for (int i = 0; i < n; i++) {
        s += x;
    }
    return s;
}

int main(){
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int chon;
    cout << "Vui long chon case: " << flush;
    cin >> chon;
    cout << endl;
    switch(chon){
    	case 1:{
    		//string: chuỗi ký tự
    		//insert, erase, substr, find
    		//size, push_back, pop_back
    		string s ="28tech";
    		cout << s << endl;
    		cout << s.size() << endl;
    		cout << s.length() << endl;
    		for(int i = 0; i < s.size(); i++){
    			cout << s[i] << " "; //char
			}
    		cout << endl;
			cout << endl;
			cin.ignore(); // Xóa ký tự xuống dòng còn sót lại
    		string s1;
    		getline(cin, s1);
    		cout << endl;
    		cout << s1 << endl;
    		cout << s1.size() << endl;
    		cout << s1.length() << endl;
			for(char x : s1){
				cout << x << " "; //char
			}
			cout << endl;
			break;
		}
		case 2:{
			//s[i]: char
			string s = "28tech dsa C++";
			string t = "dsa1";
			cout << s << endl;
			s += " " + t;
			cout << s << endl;
			break;
		}
		case 3:{
			string s = "abc";
			string t = "xyz";
			if(s < t){
			cout << "YES\n";
			} else{
			cout << "NO\n";	
			}
			break;
		}
		case 4:{
			int n;
			char a[10001];
			cin >> n;
			for(int i = 0; i < n; i++){
				cin >> a[i];
			}
			cout << array_to_string(a, n) << endl;
			break;
		}
		case 5:{
			char kitu = 'A';
			cout << (char)tolower(kitu) << endl << endl;
			string s = "nguyen VAN Linh";
			string s1 = s, s2 = s;
			for(int i = 0; i < s.size(); i++){
				s1[i] = tolower(s[i]);
				s2[i] = toupper(s[i]);
			}
			cout << s1 << endl;
			cout << s2 << endl;
			// Chuyển s3 thành chữ thường
			string s3 = inThuong(s);
			// Chuyển s4 thành chữ hoa
			string s4 = inHoa(s);
			cout << "s  = " << s << endl;
			cout << "s3 = " << s3 << endl;
			cout << "s4 = " << s4 << endl;
			break;
		}
		case 6:{
			cin.ignore();
			string s;
			getline(cin, s); //28tech28techtechdsacpp
			int tong = 0;
			cout << endl;
			for(char x : s){
				if(isdigit(x)) {
					tong += x - '0';// -48
				}
			}
			cout << tong << endl;
			break;
		}
		case 7:{
			// [Xâu Ký Tự Cơ Bản]. Bài 28. So sánh 2 số nguyên lớn
			string s, t; cin >> s >> t; // 999 781
			if(s.size() > t.size()) {
				cout << "28tech\n";
			}
			else if(s.size() < t.size()){
				cout << "29tech\n";
			}
			else{
				if(s < t) cout << "28tech\n";
				else if(s > t) cout << "29tech\n";
				else cout << "30tech\n";
			}
			break;
		}
		case 8:{
			string s = "asdauweiaw@@@   iexckawieiawieaiweuawe";
			map<char, int> mp;
			for(char x: s){
				mp[x]++;
			}
			for(auto it: mp){
				cout << it.first << " " << it.second << endl;
			}
			//int cnt[256] = {0};
			//for(char x: s) {
			//	cnt[x]++;
			//}
			//for(int i = 0; i < 256; i++){
			//	if(cnt[i]){
			//		cout << (char) i << " " << cnt[i] << endl;
			//	}
			//}
			break;
		}
		case 9:{
			// [Xâu Ký Tự Cơ Bản]. Bài 30. Permutation
			string s, t;
			cin >> s >> t;
			sort(s.begin(), s.end());
			sort(t.begin(), t.end());
			if(s.size() != t.size()){
				cout << "29tech\n";
				return 0;
			}
			for(int i=0; i < s.size(); i++){
				if(s[i] != t[i]){
					cout << "29tech\n";
					return 0;
				}
			}
			cout << "28tech\n";
//			int cnt1[256] = {0};
//			for(char x: s) cnt1 [x]++;
//			int cnt2[256] = {0};
//			for(char x: t) cnt2 [x]++;
//			for(int i = 0; i < 256;i++){
//				if(cnt1[i] != cnt2[i]){
//					cout << "29tech\n";
//					return 0;
//				}
//			}
//			cout << "28tech\n";
		}
		case 10:{
			/*--[Xâu Ký Tự Cơ Bản]. Bài 19. Đếm số lượng tự khác nhau--*/
			// cin >> "28tech 28TECH 28tECH dev"
			cin.ignore();
			string s;
			getline(cin, s);
			for(char &x: s) x = tolower(x);
			set<string> se;
			string w;
			stringstream ss(s);
			while(ss >> w){
				se.insert(w);
			}
			cout << se.size() << endl;
			break;
		}
		case 11:{
			/*--[Xâu Ký Tự Cơ Bản]. Bài 32. Tần suất của từ--*/
			cout << "Vui long chon lua chon cua case 11: ";
    		cout.flush();
			int chon1;
			cin >> chon1;
			cout << endl;
			if(chon1 == 1){
				// cin >> "cpp elon 28tech 28tech 28tech fruit orange elon orange elon"
				cin.ignore();
				string s;
				getline(cin, s);
				string w;
				stringstream ss(s);
				map<string, int> mp;
				while(ss >> w){
					mp[w]++;
				}
				cout << endl;
				for(auto it: mp){
					cout << it.first << " " << it.second << endl;
				}
				break;
			}
			if(chon1 == 2){
				/*---------------
				cin >> "
				n = 10
				joe biden
				tim cook
				leonardo da vinci
				28tech
				leonardo da vinci
				elon musk
				leonardo da vinci
				28tech
				28tech
				joe biden
				"
				---------------*/
				int n; cin >> n;
				cin.ignore();
				string s;
				map<string, int> mp;
				for (int i = 0; i < n; i++) {
				    getline(cin, s);
				    mp[s]++;
				}
				cout << endl;
				for (auto it : mp) {
				    cout << it.first << " " << it.second << endl;
				}
			break;
			}
		}
		case 12:{
			//string:
			//mang, vector, set, map luu string
			//stoi stoll stod chuoi thanh so
			//to_string: C++11
			int n1 = 12838123;
			string s1 = to_string(n1);
			cout << s1 << endl << endl;
			/*---------------------------*/
			string s = "1823811.2333223";
			double n = stod(s);
			cout << n << endl;
			break;
		}
		case 13:{
			int n = 5000;
    		string s = lapChuoi(n, "yeutuaneveryday\n");
    		cout << s << endl;
			break;
		}
		case 14:{
			/*--[Xâu Ký Tự]. Bài 31. Tổng chữ số nguyên--*/
			// cin >> "123456789"
    		string n;
    		cin >> n;
    		int sum = 0;
    		for (char x : n) {
        		sum += x - '0';
    		}
    		cout << sum << endl;
			break;
		}
	}
	return 0;
}