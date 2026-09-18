USE sieuthi;

CREATE TABLE bophan(
	mabp varchar(25) not null primary key,
    tenbp nvarchar(100) not null
);

INSERT INTO bophan
VALUES('BP001','Bộ phận đồ hải sản'),
('BP002','Bộ phận đồ kĩ thuật'),
('BP003','Bộ phận trái cây tươi'),
('BP004','Bộ phận quần áo');



CREATE TABLE nhanvien(
	manv varchar(25) not null primary key,
    tennv nvarchar(250) not null,
    luong int not null,
    maql varchar(25),
    mabp varchar(25) not null,
    FOREIGN KEY(mabp) REFERENCES bophan(mabp)
);

INSERT INTO nhanvien
VALUES('NV001','Pham Van Tu',20000000,null,'BP001'),
('NV002','Pham Van Tuan',18000000,null,'BP002'),
('NV003','Nguyen Tran Tuan Kiet',15300000,null,'BP001'),
('NV004','Tran Lan Huong',13750000,null,'BP003'),
('NV005','Vu Song Huong',17000000,null,'BP004'),
('NV006','Nguyen Van Khai',10000000,null,'BP002'),
('NV007','Mac Van Khoa',14900000,null,'BP001');


CREATE TABLE mathang(
	masmh varchar(25) not null primary key,
    tenmh nvarchar(250) not null,
    mabp varchar(25) not null,
    FOREIGN KEY(mabp) REFERENCES bophan(mabp)
);

INSERT INTO MatHang
VALUES('MH01','Xoai cat tien','BP003'),
('MH02','May khoan','BP002'),
('MH03','Ao thun','BP004'),
('MH04','Ao khoac','BP004'),
('MH05','Ca Ngu','BP001'),
('MH06','Ca Thu','BP001'),
('MH07','Bach tuoc','BP001'),
('MH08','Thanh Long','BP003'),
('MH09','Bua ta','BP002'),
('MH10','Dua Hau','BP003');

CREATE TABLE cungcap(
	macc varchar(25) not null primary key,
    masmh varchar(25) not null,
    mancc varchar(25) not null,
    giacc int not null,
    FOREIGN KEY(masmh) REFERENCES mathang(masmh),
    FOREIGN KEY(mancc) REFERENCES nguoicungcap(mancc)
);
INSERT INTO CungCap
VALUES('001','MH01','NCC01',5000),
('002','MH01','NCC02',4500),
('003','MH02','NCC02',500000),
('004','MH03','NCC03',200000),
('005','MH02','NCC04',550000),
('006','MH04','NCC04',220000),
('007','MH05','NCC05',300000),
('008','MH06','NCC06',32000),
('009','MH07','NCC05',150000),
('010','MH07','NCC01',250000),
('011','MH08','NCC05',6000),
('012','MH09','NCC01',350000);

CREATE TABLE nguoicungcap(
	mancc varchar(25) not null primary key,
    tenncc nvarchar(250) not null,
    diachincc nvarchar(250) not null
);

INSERT INTO nguoicungcap
VALUES('NCC01','Pham Xuan Chi','Hai Phong'),
('NCC02','Nguyen Xuan Loc','Ha Noi'),
('NCC03','Nguyen Van Manh','TPHCM'),
('NCC04','Nguyen Van Long','Ha Noi'),
('NCC05','Pham Xuan Chi','Hai Phong'),
('NCC06','Tran Quoc Co','Da Nang');

CREATE TABLE khachhang(
	makh varchar(25) not null primary key,
    tenkh nvarchar(250) not null,
    diachikh nvarchar(250) not null
);
INSERT INTO KhachHang
VALUES('KH001','Tran Xuan Chi','HA Noi'),
('KH002','Nguyen Xuan Loc','Phu Tho'),
('KH003','Nguyen Van Manh','TPHCM'),
('KH004','Vo Van Long','Ha Noi'),
('KH005','Pham Xuan Chi','Hai Phong'),
('KH006','Tran Quoc Co','Da Nang');
CREATE TABLE donhang(
	sohieuddh varchar(25) not null primary key,
    ngaydh date not null,
    makh varchar(25) not null,
    FOREIGN KEY(makh) REFERENCES khachhang(makh)
);
INSERT INTO donhang
VALUES('DDH01','2023-12-12','KH002'),
('DDH02','2023-12-15','KH002'),
('DDH03','2023-10-14','KH001'),
('DDH04','2023-12-12','KH002'),
('DDH05','2023-10-27','KH002'),
('DDH06','2023-08-18','KH004'),
('DDH07','2023-07-15','KH003'),
('DDH08','2023-10-30','KH006'),
('DDH09','2023-12-12','KH006');
CREATE TABLE chitietdonhang(
	id int NOT NULL AUTO_INCREMENT primary key,
    soluong int not null,
    dongia int not null,
    sohieuddh varchar(25) not null,
    masmh varchar(25) not null,
    FOREIGN KEY(sohieuddh) REFERENCES donhang(sohieuddh),
    FOREIGN KEY(masmh) REFERENCES mathang(masmh)
);


INSERT INTO chitietdonhang
VALUES (null,5,10000,'DDH01','MH01'),
(null,2,7000,'DDH01','MH05'),
(null,3,12000,'DDH02','MH05'),
(null,1,11000,'DDH02','MH03'),
(null,5,20000,'DDH06','MH02'),
(null,5,5000,'DDH01','MH04'),
(null,4,5000,'DDH06','MH09'),
(null,3,8000,'DDH07','MH06'),
(null,2,11000,'DDH07','MH03'),
(null,2,9000,'DDH01','MH08');

INSERT INTO chitietdonhang
VALUES(null,1,11000,'DDH04','MH03');


-- 1 
SELECT b.mabp, b.tenbp
FROM bophan b
JOIN mathang m ON b.mabp = m.mabp
WHERE m.tenmh='Thanh Long';


-- 2
select mathang.tenmh, mathang.masmh	
from mathang
where mathang.mabp = 'BP001';

-- 3
SELECT m.tenmh, m.mabp, cc.mancc, nc.tenncc
FROM (mathang m
INNER JOIN cungcap cc ON m.masmh = cc.masmh)
INNER JOIN nguoicungcap nc ON cc.mancc = nc.mancc
WHERE m.masmh = 'MH01';

-- 4
select nguoicungcap.mancc, nguoicungcap.tenncc, count(nguoicungcap.mancc)
from nguoicungcap
inner join cungcap on nguoicungcap.mancc = cungcap.mancc
group by nguoicungcap.mancc, nguoicungcap.tenncc
order by count(nguoicungcap.mancc) desc, nguoicungcap.mancc desc;

-- 5
SELECT COUNT(*) AS SoMatHang, SUM(soluong) AS TongSoLuong
FROM chitietdonhang
WHERE sohieuddh = 'DDH01';

-- 6

SELECT KhachHang.tenkh, donhang.sohieuddh, chitietdonhang.masmh, MatHang.tenmh, chitietdonhang.soluong
FROM KhachHang
INNER JOIN donhang ON KhachHang.makh = donhang.makh
INNER JOIN chitietdonhang ON donhang.sohieuddh = chitietdonhang.sohieuddh
INNER JOIN MatHang ON chitietdonhang.masmh = MatHang.masmh
WHERE KhachHang.makh = 'KH002';

-- 9
SELECT khachhang.makh, khachhang.tenkh, donhang.sohieuddh 
FROM khachhang
INNER JOIN donhang ON khachhang.makh = donhang.makh
WHERE MONTH(donhang.ngaydh) = 12
AND YEAR(donhang.ngaydh) = 2023;

-- 10

-- 13
SELECT KhachHang.tenkh, KhachHang.diachikh
FROM KhachHang
JOIN donhang ON KhachHang.makh = donhang.makh
WHERE donhang.sohieuddh IN ('DDH07', 'DDH08', 'DDH02')
GROUP BY KhachHang.makh;