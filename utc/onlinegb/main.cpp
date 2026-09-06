#include <iostream>
#include <fstream>
#include <string>
#include <curl/curl.h>
using namespace std;
// Neu dung curl, nho vao OnlineGDB bam icon banh rang -> Compiler options -> them "-lcurl"

size_t writeCallback(void* contents, size_t size, size_t nmemb, void* userp) {
    size_t totalSize = size * nmemb;
    ofstream* file = static_cast<ofstream*>(userp);
    file->write(static_cast<char*>(contents), totalSize);
    return totalSize;
}

int main() {
    // ==== Cac bien cau hinh ====
    string baseUrl   = "https://raw.githubusercontent.com/studyinvietnam/university/refs/heads/main/utc/2026-2027/";
    string course    = "lap_trinh_huong_doi_tuong_1_1_26_n04"; // Ten mon hoc
    string lessonPath = "tren-lop/buoi-3/Untitled1.cpp";        // Duong dan bai hoc (buoi hoc + ten file)

    string url = baseUrl + course + "/" + lessonPath;

    string sourceFile = "raw_code.cpp";
    string exeFile = "raw_program";

    CURL* curl;
    CURLcode res;
    curl_global_init(CURL_GLOBAL_DEFAULT);
    curl = curl_easy_init();
    if (!curl) {
        cerr << "Khong khoi tao duoc CURL!\n";
        return 1;
    }

    ofstream file(sourceFile);
    if (!file.is_open()) {
        cerr << "Khong tao duoc file!\n";
        curl_easy_cleanup(curl);
        return 1;
    }

    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, writeCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &file);
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
    curl_easy_setopt(curl, CURLOPT_FAILONERROR, 1L);

    cout << "Dang tai source C++ tu mon hoc: " << course << "...\n";
    res = curl_easy_perform(curl);
    file.close();

    if (res != CURLE_OK) {
        cerr << "Download failed: " << curl_easy_strerror(res) << '\n';
        curl_easy_cleanup(curl);
        curl_global_cleanup();
        return 1;
    }
    cout << "Tai thanh cong!\n";
    curl_easy_cleanup(curl);
    curl_global_cleanup();

    // ==== Bien dich rieng file vua tai thanh 1 chuong trinh khac ====
    cout << "Dang bien dich " << sourceFile << "...\n";
    string compileCmd = "g++ " + sourceFile + " -o " + exeFile + " 2>&1";
    int compileRet = system(compileCmd.c_str());

    if (compileRet != 0) {
        cerr << "Bien dich that bai!\n";
        return 1;
    }

    // ==== Chay chuong trinh vua bien dich ====
    cout << "===== Ket qua chay chuong trinh tai ve =====\n";
    string runCmd = "./" + exeFile;
    system(runCmd.c_str());

    return 0;
}