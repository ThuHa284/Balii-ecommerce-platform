const C = {
  bg: '#FAF8F6', paper: '#FFFFFF', ink: '#26232D', muted: '#777382',
  violet: '#8457C7', violetDark: '#6840A7', violetSoft: '#F0E9F9',
  peach: '#F8E9DF', sage: '#E4F1EA', rose: '#F9E7EC', amber: '#FFF2D7',
  border: '#E9E3EE', slate: '#F4F2F5', red: '#D94C61', green: '#398B67', blue: '#3B78C7'
};

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
function solid(hex, opacity = 1) { return [{ type: 'SOLID', color: rgb(hex), opacity }]; }
function shadow(alpha = .10, y = 8, blur = 24) {
  return [{ type: 'DROP_SHADOW', color: { r: .34, g: .20, b: .50, a: alpha }, offset: { x: 0, y }, radius: blur, spread: 0, visible: true, blendMode: 'NORMAL' }];
}
function box(parent, x, y, w, h, fill = C.paper, radius = 16, stroke = null) {
  const n = figma.createRectangle(); n.x=x; n.y=y; n.resize(w,h); n.fills=solid(fill); n.cornerRadius=radius;
  if (stroke) { n.strokes=solid(stroke); n.strokeWeight=1; }
  parent.appendChild(n); return n;
}
function divider(parent, x, y, w, color=C.border) { return box(parent,x,y,w,1,color,0); }
function txt(parent, value, x, y, size=14, color=C.ink, weight='Regular', width=null, align='LEFT') {
  const n=figma.createText(); n.fontName={family:'Inter',style:weight}; n.characters=value; n.fontSize=size; n.fills=solid(color);
  n.x=x; n.y=y; n.textAlignHorizontal=align; n.lineHeight={unit:'PIXELS',value:Math.round(size*1.45)};
  if(width){ n.resize(width,Math.max(size*1.6,n.height)); n.textAutoResize='HEIGHT'; } else n.textAutoResize='WIDTH_AND_HEIGHT';
  parent.appendChild(n); return n;
}
function pill(parent,label,x,y,fill=C.violetSoft,color=C.violet,w=null){
  const width=w||Math.max(74,label.length*7+24); box(parent,x,y,width,28,fill,14); txt(parent,label,x+12,y+5,11,color,'Bold'); return width;
}
function button(parent,label,x,y,w=140,kind='primary'){
  const fill=kind==='primary'?C.violet:kind==='danger'?C.rose:C.paper; const color=kind==='primary'?C.paper:kind==='danger'?C.red:C.violet;
  const b=box(parent,x,y,w,42,fill,12,kind==='outline'?C.violet:null); if(kind==='primary') b.effects=shadow(.12,5,14);
  txt(parent,label,x,y+10,14,color,'Bold',w,'CENTER'); return b;
}
function input(parent,label,placeholder,x,y,w=360){
  txt(parent,label,x,y,12,C.ink,'Bold'); box(parent,x,y+24,w,44,C.paper,12,C.border); txt(parent,placeholder,x+14,y+36,13,C.muted,'Regular',w-28);
}
function dot(parent,x,y,color=C.violet,size=8){ return box(parent,x,y,size,size,color,size/2); }
function title(parent,kicker,heading,sub=''){
  if(kicker) pill(parent,kicker,72,112,C.violetSoft,C.violet);
  txt(parent,heading,72,kicker?156:118,32,C.ink,'Bold');
  if(sub) txt(parent,sub,72,kicker?206:168,14,C.muted,'Regular',760);
}
function header(parent,active='Trang chủ'){
  const h=box(parent,0,0,1440,82,C.paper,0); h.opacity=.96; h.effects=shadow(.06,4,14);
  txt(parent,'Balii',64,20,29,C.violet,'Bold'); txt(parent,'SLEEPWEAR',146,31,9,C.muted,'Bold');
  const items=['Trang chủ','Sản phẩm','Danh mục','Bộ sưu tập','Thử đồ AI']; let x=410;
  items.forEach(v=>{ txt(parent,v,x,31,13,v===active?C.violet:C.ink,v===active?'Bold':'Regular'); if(v===active) box(parent,x,57,Math.max(52,v.length*7),2,C.violet,1); x+=128; });
  ['⌕','♡','▢','●'].forEach((v,i)=>txt(parent,v,1168+i*52,27,20,i===3?C.violet:C.ink,i===3?'Bold':'Regular'));
}
function footer(parent,y=940){
  box(parent,0,y,1440,84,C.ink,0); txt(parent,'Balii Sleepwear',64,y+24,18,C.paper,'Bold');
  txt(parent,'Đồ ngủ mềm mại • Thiết kế tinh tế • Giao hàng toàn quốc',260,y+29,12,'#D9D4DF','Regular');
  txt(parent,'© 2026 Balii',1240,y+29,11,'#D9D4DF','Regular');
}
function screen(page,name,route,section='shop'){
  const f=figma.createFrame(); f.name=`${name}  •  ${route}`; f.resize(1440,1024); f.fills=solid(C.bg); f.clipsContent=true; page.appendChild(f);
  if(section==='shop') header(f,name==='Trang chủ'?'Trang chủ':name==='Sản phẩm'?'Sản phẩm':'');
  return f;
}
function placeFrames(page,frames,cols=3){ frames.forEach((f,i)=>{f.x=(i%cols)*1520; f.y=Math.floor(i/cols)*1104;}); }
function productVisual(p,x,y,w=248,h=240,tone=C.peach,tag='MỚI'){
  const bg=box(p,x,y,w,h,tone,18); bg.effects=shadow(.06,5,18);
  box(p,x+w*.34,y+42,w*.32,h*.62,C.paper,34); box(p,x+w*.24,y+52,w*.18,h*.22,C.paper,30); box(p,x+w*.58,y+52,w*.18,h*.22,C.paper,30);
  pill(p,tag,x+14,y+14,C.paper,C.violet);
}
function productCard(p,x,y,name='Bộ pyjama lụa Luna',price='699.000₫',tone=C.peach){
  productVisual(p,x,y,250,230,tone); txt(p,name,x,y+244,14,C.ink,'Bold',240); txt(p,price,x,y+270,14,C.violet,'Bold'); txt(p,'♡',x+224,y+268,16,C.muted,'Regular');
}
function shopFrame(name,route,active='') { const f=screen(shopPage,name,route,'shop'); header(f,active); return f; }

function buildDesignSystem(page){
  const f=screen(page,'Balii Design System','Components','plain');
  txt(f,'Balii',72,60,52,C.violet,'Bold'); txt(f,'Soft Luxury Design System',72,126,18,C.muted,'Regular');
  txt(f,'Bảng màu',72,200,24,C.ink,'Bold');
  const colors=[['Violet',C.violet],['Ivory',C.bg],['Peach',C.peach],['Sage',C.sage],['Rose',C.rose],['Ink',C.ink]];
  colors.forEach((v,i)=>{box(f,72+i*180,248,148,100,v[1],18,v[1]===C.bg?C.border:null);txt(f,v[0],72+i*180,360,13,C.ink,'Bold');txt(f,v[1],72+i*180,382,11,C.muted);});
  txt(f,'Thành phần',72,450,24,C.ink,'Bold'); button(f,'Khám phá ngay',72,500,170); button(f,'Xem chi tiết',260,500,160,'outline');
  input(f,'Địa chỉ email','ban@example.com',72,580,360); pill(f,'Đang xử lý',480,604,C.amber,'#A46C16'); pill(f,'Hoàn thành',590,604,C.sage,C.green);
  const card=box(f,72,700,420,210,C.paper,20,C.border); card.effects=shadow(); txt(f,'Glass card',98,728,20,C.ink,'Bold'); txt(f,'Bề mặt trắng trong, bo góc lớn và bóng tím dịu tạo cảm giác mềm mại, hiện đại.',98,768,14,C.muted,'Regular',350);
  productCard(f,560,690,'Bộ ngủ Aurora','749.000₫',C.violetSoft);
  txt(f,'Typography',920,500,24,C.ink,'Bold'); txt(f,'Tiêu đề trang',920,548,32,C.ink,'Bold'); txt(f,'Tiêu đề khu vực',920,600,22,C.ink,'Bold'); txt(f,'Nội dung và mô tả dễ đọc',920,648,14,C.muted,'Regular');
  return f;
}

function buildHome(){
  const f=shopFrame('Trang chủ','/','Trang chủ');
  box(f,0,82,1440,510,C.violetSoft,0); box(f,960,82,480,510,C.peach,0); productVisual(f,1015,135,330,390,C.rose,'BST 2026');
  pill(f,'✦ BỘ SƯU TẬP MỚI 2026',92,150,C.paper,C.violet,210); txt(f,'Giấc Ngủ Ngọt Ngào',92,210,48,C.ink,'Bold'); txt(f,'Trong Lụa Mềm Mại',92,276,48,C.violet,'Bold');
  txt(f,'Khám phá đồ ngủ thiết kế xinh xắn, chất liệu tự nhiên và sự thoải mái trong từng khoảnh khắc.',92,354,16,C.muted,'Regular',620); button(f,'Khám phá ngay →',92,430,180); button(f,'Đồ ngủ mới nhất',286,430,180,'outline');
  const labels=[['Giao hàng miễn phí','Đơn hàng từ 500.000₫'],['Lụa cao cấp','Mềm mại và thoáng khí'],['Đổi trả 30 ngày','Mua sắm thật an tâm']];
  labels.forEach((v,i)=>{const x=110+i*410;const c=box(f,x,550,370,90,C.paper,18,C.border);c.effects=shadow(.08,6,18);dot(f,x+24,584,[C.violet,C.green,C.red][i],16);txt(f,v[0],x+54,570,14,C.ink,'Bold');txt(f,v[1],x+54,594,12,C.muted);});
  txt(f,'Sản phẩm nổi bật',64,704,27,C.ink,'Bold'); txt(f,'Xem tất cả →',1260,712,13,C.violet,'Bold');
  [C.peach,C.violetSoft,C.sage,C.rose].forEach((tone,i)=>productCard(f,64+i*330,758,['Pyjama Luna','Váy ngủ Mây','Bộ lụa Aurora','Set Cozy'][i],['699.000₫','529.000₫','749.000₫','459.000₫'][i],tone));
  return f;
}
function buildListing(name,route,kind='product'){
  const f=shopFrame(name,route,name==='Sản phẩm'?'Sản phẩm':''); title(f,kind==='search'?'12 KẾT QUẢ':'BỘ SƯU TẬP',name,kind==='search'?'Kết quả phù hợp với “lụa”':'Khám phá những thiết kế được yêu thích tại Balii.');
  box(f,72,250,250,54,C.paper,14,C.border); txt(f,'Bộ lọc  ☰',92,267,14,C.ink,'Bold');
  box(f,1040,250,320,54,C.paper,14,C.border); txt(f,'Sắp xếp: Mới nhất ⌄',1060,267,13,C.muted);
  const tones=[C.peach,C.violetSoft,C.sage,C.rose,C.amber,C.peach,C.violetSoft,C.sage];
  tones.forEach((t,i)=>productCard(f,72+(i%4)*330,340+Math.floor(i/4)*330,['Pyjama Luna','Bộ lụa Aurora','Váy ngủ Mây','Set Cozy','Pyjama Iris','Bộ ngủ Nắng','Váy lụa Daisy','Set Lavender'][i],`${459+i*40}.000₫`,t));
  return f;
}
function buildCategoriesLanding(){
  const f=shopFrame('Danh mục sản phẩm','/categories');
  const c=box(f,470,205,500,500,C.paper,24,C.border);c.effects=shadow(.12,10,30);
  box(f,680,265,80,80,C.violetSoft,40);txt(f,'▦',680,278,38,C.violet,'Bold',80,'CENTER');
  txt(f,'Danh mục sản phẩm',470,382,28,C.ink,'Bold',500,'CENTER');
  txt(f,'Tính năng này đang được Balii hoàn thiện.\nBạn quay lại sau nhé! ♥',570,440,14,C.muted,'Regular',300,'CENTER');
  button(f,'Xem tất cả sản phẩm',610,530,220);
  return f;
}
function buildCategoryDetail(){
  const f=shopFrame('Đồ ngủ lụa','/categories/do-ngu-lua');
  const hero=box(f,72,126,1296,260,C.ink,22);hero.effects=shadow(.10,8,24);
  box(f,820,126,548,260,C.violetDark,22);productVisual(f,1030,144,220,220,C.rose,'LỤA');
  txt(f,'Đồ ngủ lụa',110,238,38,C.paper,'Bold');txt(f,'Mềm mại, thoáng mát và nâng niu giấc ngủ.',110,302,15,'#DDD8E4','Regular',600);
  txt(f,'12 sản phẩm',72,422,13,C.muted,'Bold');
  [C.peach,C.violetSoft,C.sage,C.rose,C.amber,C.peach,C.violetSoft,C.sage].forEach((tone,i)=>productCard(f,72+(i%4)*330,466+Math.floor(i/4)*330,['Pyjama Luna','Bộ lụa Aurora','Váy lụa Mây','Set Lavender','Pyjama Iris','Bộ ngủ Nắng','Váy Daisy','Set Moon'][i],`${529+i*30}.000₫`,tone));
  return f;
}
function collectionCard(p,x,y,w,h,name,season,tone){
  box(p,x,y,w,h,tone,20,C.border);box(p,x,y+h*.55,w,h*.45,C.ink,20);pill(p,season,x+w-124,y+18,C.paper,C.violet,102);
  txt(p,name,x+28,y+h-142,25,C.paper,'Bold');txt(p,'Những thiết kế được tuyển chọn theo mùa và phong cách riêng biệt.',x+28,y+h-98,12,'#DDD8E4','Regular',w-160);
  txt(p,'12 sản phẩm',x+28,y+h-48,12,'#DDD8E4','Bold');txt(p,'Xem bộ sưu tập →',x+w-180,y+h-48,12,C.paper,'Bold');
}
function buildCollectionsLanding(){
  const f=shopFrame('Bộ Sưu Tập','/collections');
  box(f,72,126,1296,300,C.violetSoft,28,C.border);box(f,1040,126,328,300,C.peach,28);
  pill(f,'✦ BỘ SƯU TẬP BALII',588,176,C.paper,C.violet,264);
  txt(f,'Bộ Sưu Tập Đặc Biệt',270,238,42,C.ink,'Bold',900,'CENTER');
  txt(f,'Khám phá những bộ sưu tập đồ ngủ lụa được tuyển chọn theo chủ đề, mùa và phong cách riêng biệt.',410,310,14,C.muted,'Regular',620,'CENTER');
  collectionCard(f,72,474,620,420,'Moonlight 2026','XUÂN HÈ',C.violetSoft);
  collectionCard(f,748,474,620,420,'Soft Morning','QUANH NĂM',C.peach);
  return f;
}
function buildCollectionDetail(){
  const f=shopFrame('Moonlight 2026','/collections/moonlight-2026');
  box(f,0,82,1440,420,C.ink,0);box(f,880,82,560,420,C.violetDark,0);productVisual(f,1030,112,300,350,C.rose,'MOONLIGHT');
  txt(f,'Trang chủ  /  Bộ Sưu Tập  /  Moonlight 2026',72,178,12,'#D5CEDD','Regular');pill(f,'✦ XUÂN HÈ 2026',72,224,C.paper,C.violet,160);
  txt(f,'Moonlight 2026',72,278,44,C.paper,'Bold');txt(f,'Vẻ đẹp dịu dàng của ánh trăng trong từng đường lụa mềm mại.',72,348,15,'#DDD8E4','Regular',620);
  box(f,72,468,1296,98,C.violetSoft,18,C.violet);txt(f,'COMBO NGỦ NGON  •  Mua 2 giảm thêm 10%  •  Miễn phí vận chuyển',102,500,16,C.violet,'Bold');button(f,'Chọn combo',1160,496,170);
  txt(f,'Sản Phẩm Trong Bộ Sưu Tập',72,616,26,C.ink,'Bold');txt(f,'8 sản phẩm',72,656,12,C.muted);button(f,'← Tất cả BST',1190,622,170,'outline');
  [C.peach,C.violetSoft,C.sage].forEach((tone,i)=>productCard(f,72+i*400,706,['Pyjama Luna','Bộ lụa Aurora','Váy ngủ Mây'][i],['699.000₫','749.000₫','529.000₫'][i],tone));
  return f;
}
function buildSearch(){
  const f=shopFrame('Tìm kiếm','/search?q=lua');
  txt(f,'Tìm kiếm',72,134,34,C.ink,'Bold',1296,'CENTER');
  box(f,430,204,580,58,C.paper,18,C.border);txt(f,'⌕',454,218,22,C.muted,'Regular');txt(f,'lụa',492,220,14,C.ink,'Regular');
  txt(f,'Tìm thấy 8 kết quả cho “lụa”',72,314,14,C.muted,'Regular');
  [C.peach,C.violetSoft,C.sage,C.rose,C.amber,C.peach,C.violetSoft,C.sage].forEach((tone,i)=>productCard(f,72+(i%4)*330,360+Math.floor(i/4)*330,['Pyjama lụa Luna','Bộ lụa Aurora','Váy lụa Mây','Set lụa Lavender','Pyjama Iris','Bộ ngủ Nắng','Váy Daisy','Set Moon'][i],`${529+i*30}.000₫`,tone));
  return f;
}
function buildWishlistShop(){
  const f=shopFrame('Sản phẩm yêu thích','/wishlist');
  txt(f,'Sản phẩm yêu thích',72,140,32,C.ink,'Bold');txt(f,'8 sản phẩm đã lưu',72,188,13,C.muted);
  [C.peach,C.violetSoft,C.sage,C.rose,C.amber,C.peach,C.violetSoft,C.sage].forEach((tone,i)=>productCard(f,72+(i%4)*330,250+Math.floor(i/4)*330,['Pyjama Luna','Bộ lụa Aurora','Váy ngủ Mây','Set Cozy','Pyjama Iris','Bộ ngủ Nắng','Váy Daisy','Set Moon'][i],`${459+i*40}.000₫`,tone));
  return f;
}
function buildProductDetail(){
  const f=shopFrame('Chi tiết sản phẩm','/products/bo-pyjama-lua-luna');
  productVisual(f,72,136,610,700,C.peach,'BÁN CHẠY');
  const tones=[C.violetSoft,C.sage,C.rose]; tones.forEach((t,i)=>productVisual(f,72+i*116,858,98,88,t,''));
  pill(f,'BÁN CHẠY',760,140,C.rose,C.red); txt(f,'Bộ pyjama lụa Luna',760,188,34,C.ink,'Bold'); txt(f,'699.000₫',760,244,24,C.violet,'Bold');
  txt(f,'Thiết kế cổ điển từ lụa mềm mịn, thoáng mát và nhẹ nhàng cho giấc ngủ trọn vẹn.',760,292,14,C.muted,'Regular',560);
  divider(f,760,356,560); txt(f,'Màu sắc',760,382,13,C.ink,'Bold'); [C.rose,C.violet,C.sage].forEach((c,i)=>{box(f,760+i*48,412,34,34,c,17);});
  txt(f,'Kích thước',760,468,13,C.ink,'Bold'); ['S','M','L','XL'].forEach((v,i)=>{box(f,760+i*62,498,48,42,i===1?C.violet:C.paper,10,i===1?null:C.border);txt(f,v,760+i*62,510,13,i===1?C.paper:C.ink,'Bold',48,'CENTER');});
  button(f,'Thêm vào giỏ hàng',760,574,280); button(f,'♡ Yêu thích',1056,574,180,'outline');
  box(f,760,648,560,170,C.paper,18,C.border); txt(f,'Thông tin sản phẩm',784,674,16,C.ink,'Bold'); ['100% lụa mềm mại','Đường may tinh tế','Giặt nhẹ bằng tay','Đổi trả trong 30 ngày'].forEach((v,i)=>{dot(f,786,716+i*24,C.green,7);txt(f,v,804,708+i*24,12,C.muted);});
  return f;
}
function buildSimpleShop(name,route,mode){
  const f=shopFrame(name,route); title(f,'BALII',name,mode==='faq'?'Các câu hỏi thường gặp':'Trải nghiệm mua sắm nhẹ nhàng và thuận tiện.');
  if(mode==='contact'){
    box(f,72,250,560,620,C.paper,20,C.border); txt(f,'Gửi lời nhắn',104,282,22,C.ink,'Bold'); input(f,'Họ và tên','Nguyễn Thảo My',104,334,496); input(f,'Email','my@example.com',104,420,496); input(f,'Nội dung','Bạn cần Balii hỗ trợ điều gì?',104,506,496); button(f,'Gửi liên hệ',104,604,180);
    box(f,680,250,680,270,C.violetSoft,22); txt(f,'Chúng tôi luôn ở đây',720,288,24,C.violet,'Bold'); txt(f,'Hotline  •  0901 234 567\nEmail     •  hello@balii.vn\nĐịa chỉ   •  TP. Hồ Chí Minh',720,342,15,C.ink,'Regular',500);
  } else if(mode==='faq'){
    ['Balii sử dụng chất liệu gì?','Chính sách đổi trả như thế nào?','Bao lâu tôi nhận được hàng?','Có thể thử đồ bằng AI không?','Làm sao sử dụng voucher?'].forEach((v,i)=>{box(f,160,252+i*100,1120,76,C.paper,16,C.border);txt(f,v,188,277+i*100,15,C.ink,'Bold');txt(f,'＋',1230,271+i*100,20,C.violet,'Bold');});
  } else if(mode==='compare'){
    ['Bộ pyjama Luna','Bộ lụa Aurora','Set Cozy'].forEach((v,i)=>{const x=340+i*300;productVisual(f,x,250,220,220,[C.peach,C.violetSoft,C.sage][i]);txt(f,v,x,488,15,C.ink,'Bold',220,'CENTER');});
    ['Giá','Chất liệu','Kích thước','Đánh giá'].forEach((v,i)=>{txt(f,v,100,570+i*72,13,C.muted,'Bold');divider(f,100,602+i*72,1200);[0,1,2].forEach(j=>txt(f,[['699.000₫','749.000₫','459.000₫'],['Lụa satin','Lụa tơ tằm','Cotton mềm'],['S–XL','M–XL','S–L'],['4.9 / 5','4.8 / 5','4.7 / 5']][i][j],340+j*300,570+i*72,13,C.ink,'Bold',220,'CENTER'));});
  }
  return f;
}
function buildCart(){
  const f=shopFrame('Giỏ hàng','/cart'); title(f,'3 SẢN PHẨM','Giỏ hàng của bạn','Kiểm tra sản phẩm trước khi thanh toán.');
  box(f,72,250,820,590,C.paper,20,C.border); ['Pyjama Luna','Váy ngủ Mây','Set Cozy'].forEach((v,i)=>{productVisual(f,100,282+i*170,120,132,[C.peach,C.violetSoft,C.sage][i],i===0?'MỚI':'');txt(f,v,246,300+i*170,16,C.ink,'Bold');txt(f,['M • Hồng phấn','L • Tím nhạt','M • Xanh sage'][i],246,332+i*170,12,C.muted);txt(f,['699.000₫','529.000₫','459.000₫'][i],246,374+i*170,14,C.violet,'Bold');box(f,650,335+i*170,132,38,C.slate,10);txt(f,'−   1   +',650,344+i*170,14,C.ink,'Bold',132,'CENTER');txt(f,'×',830,344+i*170,18,C.muted);if(i<2)divider(f,100,438+i*170,760);});
  box(f,930,250,430,360,C.paper,20,C.border); txt(f,'Tóm tắt đơn hàng',958,282,20,C.ink,'Bold'); [['Tạm tính','1.687.000₫'],['Giảm giá','−100.000₫'],['Vận chuyển','Miễn phí']].forEach((v,i)=>{txt(f,v[0],958,334+i*42,13,C.muted);txt(f,v[1],1160,334+i*42,13,i===1?C.green:C.ink,'Bold',170,'RIGHT');});divider(f,958,470,374);txt(f,'Tổng cộng',958,492,15,C.ink,'Bold');txt(f,'1.587.000₫',1160,488,20,C.violet,'Bold',170,'RIGHT');button(f,'Tiến hành thanh toán',958,548,374);
  return f;
}
function buildCheckout(name='Thanh toán',route='/checkout',state='form'){
  const f=shopFrame(name,route); title(f,'BƯỚC 2/3',name,state==='success'?'Đơn hàng của bạn đã được tiếp nhận.':'Hoàn tất thông tin giao hàng và thanh toán.');
  if(state==='success'){
    box(f,350,256,740,540,C.paper,24,C.border); box(f,650,310,140,140,C.sage,70);txt(f,'✓',650,326,72,C.green,'Bold',140,'CENTER');txt(f,'Đặt hàng thành công!',350,480,30,C.ink,'Bold',740,'CENTER');txt(f,'Mã đơn hàng #BAL26071501',350,536,15,C.muted,'Bold',740,'CENTER');txt(f,'Cảm ơn bạn đã mua sắm tại Balii. Chúng tôi sẽ sớm giao những món đồ thật mềm mại đến bạn.',500,586,14,C.muted,'Regular',440,'CENTER');button(f,'Theo dõi đơn hàng',520,674,200);button(f,'Tiếp tục mua sắm',736,674,180,'outline');
  } else {
    box(f,72,250,790,650,C.paper,20,C.border);txt(f,'Thông tin giao hàng',104,282,20,C.ink,'Bold');input(f,'Họ và tên','Nguyễn Thảo My',104,334,350);input(f,'Số điện thoại','0901 234 567',480,334,350);input(f,'Địa chỉ','12 Nguyễn Huệ, Quận 1, TP.HCM',104,420,726);txt(f,'Phương thức thanh toán',104,512,13,C.ink,'Bold');['Thanh toán khi nhận hàng','VNPay','Ví điện tử'].forEach((v,i)=>{box(f,104,544+i*62,726,48,i===0?C.violetSoft:C.paper,12,i===0?C.violet:C.border);dot(f,124,564+i*62,i===0?C.violet:C.border,10);txt(f,v,148,558+i*62,13,C.ink,i===0?'Bold':'Regular');});
    box(f,902,250,458,420,C.paper,20,C.border);txt(f,'Đơn hàng',930,282,20,C.ink,'Bold');['Pyjama Luna × 1','Váy ngủ Mây × 1','Set Cozy × 1'].forEach((v,i)=>{txt(f,v,930,332+i*44,13,C.ink);txt(f,['699.000₫','529.000₫','459.000₫'][i],1170,332+i*44,13,C.ink,'Bold',160,'RIGHT');});divider(f,930,474,400);txt(f,'Tổng thanh toán',930,500,14,C.ink,'Bold');txt(f,'1.587.000₫',1160,496,20,C.violet,'Bold',170,'RIGHT');button(f,'Đặt hàng',930,574,400);
  } return f;
}
function buildTryOn(){
  const f=shopFrame('Thử đồ AI','/try-on'); title(f,'AI VIRTUAL TRY-ON','Phòng thử đồ ảo','Tải ảnh lên, chọn sản phẩm và xem trước phong cách của bạn.');
  box(f,72,250,400,650,C.paper,20,C.border);txt(f,'1. Ảnh của bạn',100,282,17,C.ink,'Bold');box(f,100,326,344,330,C.violetSoft,18,C.violet);txt(f,'＋',100,410,52,C.violet,'Regular',344,'CENTER');txt(f,'Tải ảnh toàn thân',100,486,15,C.violet,'Bold',344,'CENTER');txt(f,'PNG hoặc JPG • Tối đa 10 MB',100,518,11,C.muted,'Regular',344,'CENTER');button(f,'Chọn ảnh',182,590,180);
  box(f,500,250,400,650,C.paper,20,C.border);txt(f,'2. Chọn đồ ngủ',528,282,17,C.ink,'Bold');[C.peach,C.violetSoft,C.sage,C.rose].forEach((t,i)=>{productVisual(f,528+(i%2)*174,326+Math.floor(i/2)*230,150,160,t,i===0?'ĐÃ CHỌN':'');txt(f,['Luna','Aurora','Cozy','Mây'][i],528+(i%2)*174,498+Math.floor(i/2)*230,12,C.ink,'Bold');});
  box(f,928,250,432,650,C.violetSoft,20,C.violet);txt(f,'3. Kết quả AI',956,282,17,C.ink,'Bold');box(f,956,326,376,430,C.paper,18);txt(f,'✦',956,450,64,C.violet,'Bold',376,'CENTER');txt(f,'Sẵn sàng tạo ảnh thử đồ',956,548,15,C.ink,'Bold',376,'CENTER');button(f,'Tạo ảnh thử đồ',1036,792,216);
  return f;
}

function authScreen(name,route,mode){
  const f=screen(authPage,name,route,'plain'); box(f,0,0,610,1024,C.violetSoft,0); productVisual(f,112,130,386,520,C.rose,'BALII');txt(f,'Mặc đẹp cả trong giấc ngủ',92,720,36,C.violet,'Bold',430);txt(f,'Nhẹ nhàng, mềm mại và là chính bạn.',92,784,15,C.muted,'Regular',420);
  txt(f,'Balii',820,90,30,C.violet,'Bold');txt(f,name,760,180,30,C.ink,'Bold');txt(f,mode==='login'?'Chào mừng bạn quay lại với Balii.':'Tạo tài khoản để lưu lại những món đồ yêu thích.',760,230,14,C.muted,'Regular',520);
  if(mode==='forgot'||mode==='reset'){input(f,'Email','ban@example.com',760,310,500);if(mode==='reset')input(f,'Mật khẩu mới','••••••••••',760,400,500);button(f,mode==='forgot'?'Gửi liên kết đặt lại':'Cập nhật mật khẩu',760,510,500);}
  else {input(f,'Email','ban@example.com',760,310,500);input(f,'Mật khẩu','••••••••••',760,400,500);if(mode==='register')input(f,'Họ và tên','Nguyễn Thảo My',760,490,500);button(f,mode==='login'?'Đăng nhập':'Tạo tài khoản',760,mode==='register'?600:510,500);txt(f,mode==='login'?'Chưa có tài khoản? Đăng ký':'Đã có tài khoản? Đăng nhập',760,mode==='register'?672:582,13,C.violet,'Bold',500,'CENTER');}
  return f;
}

function accountBase(name,route){
  const f=screen(accountPage,name,route,'plain'); header(f,'');
  box(f,0,82,280,942,C.paper,0);txt(f,'Tài khoản của tôi',34,122,20,C.ink,'Bold');txt(f,'Nguyễn Thảo My',34,158,13,C.muted);
  ['Hồ sơ','Địa chỉ','Đơn hàng','Kho voucher','Yêu thích','Lịch sử thử đồ'].forEach((v,i)=>{const active=name.includes(v)||name==='Chi tiết đơn hàng'&&v==='Đơn hàng';box(f,22,210+i*58,236,44,active?C.violet:C.paper,12);txt(f,v,44,223+i*58,13,active?C.paper:C.ink,active?'Bold':'Regular');});
  return f;
}
function buildAccount(name,route,mode){
  const f=accountBase(name,route);txt(f,name,330,126,30,C.ink,'Bold');txt(f,'Quản lý thông tin và trải nghiệm mua sắm của bạn.',330,174,14,C.muted);
  if(mode==='profile'||mode==='address'){
    box(f,330,230,1030,620,C.paper,20,C.border);txt(f,mode==='profile'?'Thông tin cá nhân':'Địa chỉ đã lưu',362,262,20,C.ink,'Bold');
    if(mode==='profile'){input(f,'Họ và tên','Nguyễn Thảo My',362,324,450);input(f,'Email','my@example.com',836,324,450);input(f,'Số điện thoại','0901 234 567',362,414,450);input(f,'Ngày sinh','12/08/2002',836,414,450);button(f,'Lưu thay đổi',362,530,180);}else{[0,1].forEach(i=>{box(f,362,324+i*180,926,150,i===0?C.violetSoft:C.bg,16,i===0?C.violet:C.border);pill(f,i===0?'MẶC ĐỊNH':'VĂN PHÒNG',386,346,i===0?C.violet:C.slate,i===0?C.paper:C.muted);txt(f,i===0?'Nguyễn Thảo My • 0901 234 567':'Thảo My • 0909 888 777',386,390,14,C.ink,'Bold');txt(f,i===0?'12 Nguyễn Huệ, Quận 1, TP.HCM':'88 Điện Biên Phủ, Quận 3, TP.HCM',386,424,13,C.muted);txt(f,'Sửa  •  Xóa',1120,390,12,C.violet,'Bold');});button(f,'＋ Thêm địa chỉ',362,716,180);}
  } else if(mode==='orders'){
    ['#BAL26071501','#BAL26070318','#BAL26062509'].forEach((v,i)=>{box(f,330,236+i*190,1030,158,C.paper,18,C.border);txt(f,v,358,260+i*190,15,C.ink,'Bold');pill(f,['Đang giao','Hoàn thành','Đã hủy'][i],1130,254+i*190,[C.amber,C.sage,C.rose][i],[C.ink,C.green,C.red][i]);txt(f,['2 sản phẩm • 1.228.000₫','1 sản phẩm • 749.000₫','3 sản phẩm • 1.587.000₫'][i],358,312+i*190,13,C.muted);txt(f,['Dự kiến giao 17/07/2026','Đã giao 05/07/2026','Đã hủy 26/06/2026'][i],358,344+i*190,12,C.muted);button(f,'Xem chi tiết',1160,330+i*190,160,'outline');});
  } else if(mode==='orderDetail'){
    box(f,330,230,1030,140,C.paper,18,C.border);pill(f,'ĐANG GIAO',358,256,C.amber,C.ink);txt(f,'Đơn hàng #BAL26071501',358,302,19,C.ink,'Bold');txt(f,'Đặt ngày 15/07/2026',1100,306,12,C.muted);
    box(f,330,398,660,420,C.paper,18,C.border);txt(f,'Sản phẩm',358,426,17,C.ink,'Bold');['Pyjama Luna','Váy ngủ Mây'].forEach((v,i)=>{productVisual(f,358,470+i*146,100,112,[C.peach,C.violetSoft][i],'');txt(f,v,482,488+i*146,14,C.ink,'Bold');txt(f,['M • Hồng phấn','L • Tím nhạt'][i],482,520+i*146,12,C.muted);txt(f,['699.000₫','529.000₫'][i],800,510+i*146,13,C.violet,'Bold');});
    box(f,1018,398,342,420,C.paper,18,C.border);txt(f,'Theo dõi',1046,426,17,C.ink,'Bold');['Đã xác nhận','Đã đóng gói','Đang vận chuyển','Giao thành công'].forEach((v,i)=>{dot(f,1050,484+i*64,i<3?C.violet:C.border,12);txt(f,v,1080,476+i*64,13,i<3?C.ink:C.muted,i===2?'Bold':'Regular');if(i<3)box(f,1055,498+i*64,2,44,i<2?C.violet:C.border,1);});
  } else if(mode==='vouchers') {
    box(f,330,226,390,46,C.paper,12,C.border);box(f,334,230,190,38,C.violet,10);txt(f,'Voucher có sẵn  4',334,241,12,C.paper,'Bold',190,'CENTER');txt(f,'Đã thu thập  2',528,241,12,C.muted,'Bold',188,'CENTER');
    [['20%','SLEEP20','Giảm 20% cho đồ ngủ lụa'],['100K','BALII100','Giảm 100.000₫ đơn từ 800K'],['FREE','FREESHIP','Miễn phí vận chuyển toàn quốc']].forEach((v,i)=>{const y=306+i*188;box(f,330,y,1030,160,C.paper,18,C.border);box(f,330,y,170,160,C.violet,18);txt(f,v[0],330,y+38,30,C.paper,'Bold',170,'CENTER');txt(f,'GIẢM GIÁ',330,y+88,10,C.paper,'Bold',170,'CENTER');txt(f,v[2],534,y+28,16,C.ink,'Bold');txt(f,'Mã: '+v[1],534,y+62,12,C.violet,'Bold');txt(f,'Đơn tối thiểu 500.000₫  •  HSD: 31/07/2026',534,y+92,11,C.muted);box(f,534,y+124,500,5,C.violetSoft,3);box(f,534,y+124,330-i*55,5,C.violet,3);button(f,i===1?'Đã lưu':'Thu thập',1160,y+94,160,i===1?'outline':'primary');});
  } else {
    const items=mode==='tryon'?['Luna • 15/07/2026','Aurora • 10/07/2026','Cozy • 02/07/2026','Mây • 28/06/2026']:['Pyjama Luna','Bộ lụa Aurora','Váy ngủ Mây','Set Cozy'];
    items.forEach((v,i)=>{const x=330+(i%2)*520,y=236+Math.floor(i/2)*260;box(f,x,y,490,220,i%2?C.paper:C.violetSoft,18,C.border);productVisual(f,x+20,y+20,170,180,[C.peach,C.violetSoft,C.sage,C.rose][i],mode==='tryon'?'AI':'♡');txt(f,v,x+216,y+56,15,C.ink,'Bold',240);txt(f,mode==='tryon'?'Xem kết quả thử đồ':'699.000₫',x+216,y+96,13,C.violet,'Bold');button(f,mode==='tryon'?'Thử lại':'Thêm vào giỏ',x+216,y+142,180);});
  } return f;
}

const adminNav=['Tổng quan','Sản phẩm','Danh mục','Bộ sưu tập','Chiến dịch','Đơn hàng','Workflow','Voucher','Khách hàng','Phân tích thị trường','Cài đặt hệ thống'];
function adminBase(name,route){
  const f=screen(adminPage,name,route,'plain');box(f,0,0,258,1024,C.paper,0);txt(f,'Balii',28,28,28,C.violet,'Bold');pill(f,'QUẢN TRỊ',104,32,C.violetSoft,C.violet,104);box(f,22,92,214,42,C.slate,12,C.border);txt(f,'⌕  Tìm nhanh...  Ctrl+K',36,104,11,C.muted,'Bold');
  adminNav.forEach((v,i)=>{const active=name===v||(name==='Thêm / sửa sản phẩm'&&v==='Sản phẩm')||(name==='Phân tích & báo cáo'&&v==='Tổng quan');box(f,16,158+i*61,226,46,active?C.violet:C.paper,12);txt(f,v,38,172+i*61,12,active?C.paper:C.ink,active?'Bold':'Regular');});
  box(f,258,0,1182,78,C.paper,0);txt(f,name,298,24,24,C.ink,'Bold');txt(f,'Thông báo  ◌    Admin Balii ●',1160,29,12,C.muted,'Bold'); return f;
}
function stats(p,vals){vals.forEach((v,i)=>{const x=298+i*270;const c=box(p,x,108,244,120,C.paper,16,C.border);c.effects=shadow(.05,4,16);txt(p,v[0],x+20,130,12,C.muted,'Bold');txt(p,v[1],x+20,164,24,C.ink,'Bold');pill(p,v[2],x+138,176,v[2].startsWith('+')?C.sage:C.rose,v[2].startsWith('+')?C.green:C.red,86);});}
function table(p,headers,rows,y=290){
  const x=298,w=1102;box(p,x,y,w,Math.min(620,72+rows.length*58),C.paper,18,C.border);const col=w/headers.length;headers.forEach((h,i)=>txt(p,h,x+18+i*col,y+22,11,C.muted,'Bold',col-28));divider(p,x,y+52,w);rows.forEach((row,r)=>{row.forEach((v,i)=>txt(p,String(v),x+18+i*col,y+72+r*58,12,i===0?C.ink:C.muted,i===0?'Bold':'Regular',col-28));if(r<rows.length-1)divider(p,x+18,y+106+r*58,w-36);});
}
function adminList(name,route,type){
  const f=adminBase(name,route);button(f,type==='product'?'+ Thêm sản phẩm':'+ Tạo mới',1210,96,190);box(f,298,166,770,46,C.paper,12,C.border);txt(f,'⌕  Tìm kiếm theo tên, mã hoặc trạng thái...',316,180,12,C.muted);box(f,1090,166,310,46,C.paper,12,C.border);txt(f,'Lọc trạng thái ⌄',1110,180,12,C.muted);
  const data={product:[['SP001','Pyjama Luna','699.000₫','Còn hàng'],['SP002','Bộ lụa Aurora','749.000₫','Còn hàng'],['SP003','Váy ngủ Mây','529.000₫','Sắp hết'],['SP004','Set Cozy','459.000₫','Ẩn']],category:[['DM01','Đồ ngủ lụa','24 sản phẩm','Đang hiển thị'],['DM02','Pyjama','18 sản phẩm','Đang hiển thị'],['DM03','Váy ngủ','16 sản phẩm','Đang hiển thị'],['DM04','Phụ kiện','8 sản phẩm','Tạm ẩn']],collection:[['BST01','Moonlight 2026','12 sản phẩm','Đang chạy'],['BST02','Soft Morning','10 sản phẩm','Sắp diễn ra'],['BST03','Lavender Dream','8 sản phẩm','Đã kết thúc']],campaign:[['CD01','Mùa hè mềm mại','Giảm 20%','Đang chạy'],['CD02','Combo ngủ ngon','Tặng phụ kiện','Đang chạy'],['CD03','Midnight Sale','Giảm 100K','Sắp diễn ra']],order:[['#BAL26071501','Nguyễn Thảo My','1.228.000₫','Đang giao'],['#BAL26071422','Trần Minh Anh','749.000₫','Đã xác nhận'],['#BAL26071308','Lê Ngọc Hà','1.587.000₫','Hoàn thành'],['#BAL26071211','Phạm Mỹ Linh','459.000₫','Đã hủy']],voucher:[['BALII100','Giảm 100.000₫','128 lượt','Đang chạy'],['FREESHIP','Miễn phí vận chuyển','245 lượt','Đang chạy'],['SLEEP20','Giảm 20%','86 lượt','Sắp hết hạn']],user:[['KH001','Nguyễn Thảo My','my@example.com','Thành viên'],['KH002','Trần Minh Anh','anh@example.com','VIP'],['KH003','Lê Ngọc Hà','ha@example.com','Thành viên'],['KH004','Phạm Mỹ Linh','linh@example.com','Đã khóa']],refund:[['RF001','#BAL26062509','459.000₫','Chờ duyệt'],['RF002','#BAL26061007','749.000₫','Đã hoàn'],['RF003','#BAL26060201','529.000₫','Từ chối']]};
  table(f,type==='order'?['Mã đơn','Khách hàng','Tổng tiền','Trạng thái']:type==='user'?['Mã KH','Khách hàng','Email','Hạng']:['Mã','Tên','Thông tin','Trạng thái'],data[type]||data.product,242);return f;
}
function adminProductsExact(){
  const f=adminBase('Sản phẩm','/admin/products');
  box(f,298,106,1102,300,C.ink,26);box(f,1060,106,340,300,C.violetDark,26);
  txt(f,'QUẢN TRỊ DANH MỤC BÁN HÀNG',326,134,10,'#C7BFCE','Bold');pill(f,'QUẢN TRỊ VIÊN',326,166,'#40394A',C.paper,132);
  txt(f,'Sản phẩm và tồn kho',326,210,30,C.paper,'Bold');txt(f,'Theo dõi nhanh số lượng sản phẩm, hàng nổi bật và trạng thái tồn kho để xử lý vận hành hằng ngày.',326,258,13,'#D5CEDD','Regular',620);
  button(f,'Tạo chiến dịch',870,206,150,'outline');button(f,'Import Excel',1034,206,140,'outline');button(f,'＋ Thêm sản phẩm',1188,206,184,'primary');
  [['Sản phẩm đang hiển thị','42'],['Tổng tồn kho','1.286'],['Hết hàng / nổi bật','3 / 12']].forEach((v,i)=>{const x=326+i*340;box(f,x,326,312,62,'#40394A',14,'#5B5265');txt(f,v[0],x+16,338,11,'#CFC7D6','Bold');txt(f,v[1],x+16,358,20,C.paper,'Bold');});
  box(f,298,432,1102,76,C.paper,16,C.border);box(f,318,448,410,44,C.bg,12,C.border);txt(f,'⌕  Tìm theo tên hoặc slug sản phẩm...',334,461,11,C.muted);['Tất cả danh mục ⌄','Tất cả tồn kho ⌄','Tất cả mức giá ⌄'].forEach((v,i)=>{box(f,746+i*210,448,194,44,C.bg,12,C.border);txt(f,v,760+i*210,461,11,C.muted);});
  table(f,['Sản phẩm','Danh mục','Giá bán','Tồn kho','Trạng thái'],[['Pyjama Luna','Đồ ngủ lụa','699.000₫','42','Đang bán'],['Bộ lụa Aurora','Pyjama','749.000₫','31','Nổi bật'],['Váy ngủ Mây','Váy ngủ','529.000₫','8','Sắp hết'],['Set Cozy','Cotton','459.000₫','0','Hết hàng']],534);return f;
}
function adminMarketExact(name='Phân tích thị trường',route='/admin/market-analysis'){
  const f=adminBase(name,route);box(f,298,108,42,42,C.violetSoft,12);txt(f,'⌁',298,116,20,C.violet,'Bold',42,'CENTER');txt(f,'Phân tích thị trường',354,108,21,C.ink,'Bold');txt(f,'Tìm sản phẩm tương tự trên thị trường bằng hình ảnh',354,140,11,C.muted);
  box(f,298,182,380,740,C.paper,18,C.border);txt(f,'Nguồn ảnh',322,208,11,C.muted,'Bold');box(f,322,240,160,44,C.violetSoft,12,C.violet);txt(f,'Từ máy tính',322,253,12,C.violet,'Bold',160,'CENTER');box(f,494,240,160,44,C.bg,12,C.border);txt(f,'Ảnh của shop',494,253,12,C.ink,'Bold',160,'CENTER');
  box(f,322,310,332,130,C.violetSoft,14,C.violet);txt(f,'⇧',322,330,28,C.violet,'Bold',332,'CENTER');txt(f,'Chọn ảnh JPEG, PNG, WEBP',322,378,12,C.violet,'Bold',332,'CENTER');
  input(f,'Danh mục tìm kiếm','Đồ ngủ / Thời trang',322,470,332);input(f,'Quốc gia','Việt Nam',322,556,332);input(f,'Số kết quả','10',322,642,332);button(f,'✦ Bắt đầu phân tích',322,746,332);
  box(f,704,182,696,740,C.paper,18,C.border);txt(f,'Kết quả phân tích',732,210,15,C.ink,'Bold');box(f,842,300,420,420,C.bg,210,C.border);txt(f,'⌕',842,400,64,C.violetSoft,'Bold',420,'CENTER');txt(f,'Chưa có kết quả phân tích',842,502,17,C.ink,'Bold',420,'CENTER');txt(f,'Tải ảnh sản phẩm lên và bắt đầu tìm kiếm\nnhững sản phẩm tương tự trên thị trường.',912,548,12,C.muted,'Regular',280,'CENTER');return f;
}
function dashboard(){
  const f=adminBase('Tổng quan','/admin/dashboard');stats(f,[['Doanh thu','128,6 triệu','+18%'],['Đơn hàng','426','+12%'],['Khách hàng mới','98','+24%'],['Tỷ lệ hoàn','2,4%','−0,6%']]);
  box(f,298,260,700,360,C.paper,18,C.border);txt(f,'Doanh thu 7 ngày',326,288,17,C.ink,'Bold');const hs=[90,130,110,190,160,240,210];hs.forEach((h,i)=>{box(f,350+i*82,570-h,42,h,C.violet,10);txt(f,['T2','T3','T4','T5','T6','T7','CN'][i],350+i*82,584,11,C.muted,'Bold',42,'CENTER');});
  box(f,1024,260,376,360,C.paper,18,C.border);txt(f,'Đơn theo trạng thái',1052,288,17,C.ink,'Bold');[['Chờ xác nhận','18',C.amber],['Đang giao','42',C.violetSoft],['Hoàn thành','356',C.sage],['Đã hủy','10',C.rose]].forEach((v,i)=>{box(f,1052,338+i*58,320,42,v[2],12);txt(f,v[0],1070,350+i*58,12,C.ink,'Bold');txt(f,v[1],1300,350+i*58,12,C.ink,'Bold',50,'RIGHT');});
  table(f,['Sản phẩm bán chạy','Đã bán','Doanh thu','Tồn kho'],[['Pyjama Luna','128','89,4 triệu','42'],['Bộ lụa Aurora','96','71,9 triệu','31'],['Váy ngủ Mây','82','43,4 triệu','18']],658);return f;
}
function adminForm(){
  const f=adminBase('Thêm / sửa sản phẩm','/admin/products/form');box(f,298,108,760,820,C.paper,18,C.border);txt(f,'Thông tin sản phẩm',326,136,19,C.ink,'Bold');input(f,'Tên sản phẩm','Bộ pyjama lụa Luna',326,190,704);input(f,'Mô tả ngắn','Mềm mại và thoáng mát cho giấc ngủ...',326,280,704);input(f,'Giá bán','699.000',326,370,330);input(f,'Giá so sánh','799.000',700,370,330);input(f,'Danh mục','Đồ ngủ lụa ⌄',326,460,330);input(f,'Bộ sưu tập','Moonlight 2026 ⌄',700,460,330);txt(f,'Kích thước',326,550,12,C.ink,'Bold');['S','M','L','XL'].forEach((v,i)=>pill(f,v,326+i*66,580,i===1?C.violet:C.slate,i===1?C.paper:C.ink,48));input(f,'Tồn kho','42',326,636,330);button(f,'Lưu sản phẩm',326,742,180);button(f,'Xem trước',520,742,160,'outline');box(f,1084,108,316,420,C.paper,18,C.border);txt(f,'Ảnh sản phẩm',1112,136,19,C.ink,'Bold');productVisual(f,1112,186,260,270,C.peach,'ẢNH CHÍNH');button(f,'＋ Thêm ảnh',1152,476,180,'outline');return f;
}
function adminSpecial(name,route,mode){
  const f=adminBase(name,route);
  if(mode==='analytics'||mode==='market'){stats(f,[['Doanh thu','128,6 triệu','+18%'],['Tỷ lệ chuyển đổi','4,8%','+0,9%'],['Giá trị đơn TB','612.000₫','+7%'],['Khách quay lại','38%','+5%']]);
    box(f,298,260,720,360,C.paper,18,C.border);txt(f,mode==='market'?'So sánh giá thị trường':'Xu hướng doanh thu',326,288,18,C.ink,'Bold');const hs=[80,130,100,190,145,230,205,260,220];hs.forEach((h,i)=>box(f,350+i*68,574-h,34,h,i%2?C.violetSoft:C.violet,8));box(f,1044,260,356,360,C.paper,18,C.border);txt(f,'Phân khúc khách hàng',1072,288,18,C.ink,'Bold');[['Gen Z','42%',C.violet],['Nhân viên VP','31%',C.green],['Mẹ bỉm','18%',C.red],['Khác','9%',C.blue]].forEach((v,i)=>{dot(f,1074,344+i*58,v[2],14);txt(f,v[0],1100,337+i*58,13,C.ink,'Bold');txt(f,v[1],1290,337+i*58,13,C.ink,'Bold',70,'RIGHT');});table(f,['Chỉ số','Hiện tại','Kỳ trước','Thay đổi'],[['Lượt truy cập','18.420','15.930','+15,6%'],['Thêm vào giỏ','2.846','2.410','+18,1%'],['Đơn thành công','426','381','+11,8%']],658);
  } else if(mode==='workflow'){
    txt(f,'Luồng xử lý đơn hàng',298,116,18,C.ink,'Bold');const nodes=[['Đơn mới',C.amber],['Xác nhận',C.violetSoft],['Đóng gói',C.peach],['Vận chuyển',C.blue],['Hoàn thành',C.sage]];nodes.forEach((v,i)=>{const x=298+i*214;box(f,x,200,174,110,v[1],18,C.border);txt(f,v[0],x,234,15,C.ink,'Bold',174,'CENTER');if(i<4){txt(f,'→',x+184,236,24,C.violet,'Bold');}});table(f,['Workflow','Kích hoạt','Lần chạy gần nhất','Trạng thái'],[['Xác nhận đơn tự động','Có','15/07/2026 14:20','Hoạt động'],['Nhắc đơn quá hạn','Có','15/07/2026 13:00','Hoạt động'],['Yêu cầu đánh giá','Không','12/07/2026 09:00','Tạm dừng']],390);
  } else if(mode==='ai'){
    stats(f,[['Hội thoại hôm nay','186','+16%'],['Tỷ lệ giải quyết','82%','+7%'],['Try-on đã tạo','94','+22%'],['Chi phí AI','1,8 triệu','−8%']]);box(f,298,260,500,570,C.paper,18,C.border);txt(f,'Trợ lý Balii AI',326,288,18,C.ink,'Bold');[['Khách','Tôi nên chọn size nào?'],['AI','Bạn cho mình chiều cao và cân nặng nhé.'],['Khách','1m60, 50kg.'],['AI','Size M sẽ vừa vặn và thoải mái với bạn.']].forEach((v,i)=>{box(f,v[0]==='AI'?326:450,340+i*100,v[0]==='AI'?410:320,70,v[0]==='AI'?C.violetSoft:C.slate,15);txt(f,v[1],v[0]==='AI'?344:468,358+i*100,12,C.ink,v[0]==='AI'?'Bold':'Regular',v[0]==='AI'?370:280);});box(f,826,260,574,570,C.paper,18,C.border);txt(f,'Cấu hình trợ lý',854,288,18,C.ink,'Bold');input(f,'Tên trợ lý','Balii Assistant',854,342,518);input(f,'Giọng điệu','Thân thiện, nhẹ nhàng ⌄',854,432,518);input(f,'Thông điệp chào','Xin chào, Balii có thể giúp gì cho bạn?',854,522,518);button(f,'Lưu cấu hình',854,640,180);
  } else if(mode==='settings'){
    box(f,298,108,1102,780,C.paper,18,C.border);txt(f,'Cài đặt cửa hàng',326,136,20,C.ink,'Bold');input(f,'Tên cửa hàng','Balii Sleepwear',326,196,500);input(f,'Email hỗ trợ','hello@balii.vn',850,196,500);input(f,'Hotline','0901 234 567',326,286,500);input(f,'Ngưỡng miễn phí vận chuyển','500.000₫',850,286,500);txt(f,'Tích hợp',326,388,16,C.ink,'Bold');[['Thanh toán VNPay','Đã kết nối'],['Cloudinary','Đã kết nối'],['AI Try-On','Đang hoạt động'],['Email thông báo','Đã kết nối']].forEach((v,i)=>{box(f,326,430+i*70,1024,52,C.bg,12,C.border);txt(f,v[0],346,446+i*70,13,C.ink,'Bold');pill(f,v[1],1190,442+i*70,C.sage,C.green,130);});button(f,'Lưu cài đặt',326,742,180);
  } return f;
}

let designPage, shopPage, authPage, accountPage, adminPage;
function newPage(name){const p=figma.createPage();p.name=name;return p;}

async function main() {
  await Promise.all([
    figma.loadFontAsync({family:'Inter',style:'Regular'}),
    figma.loadFontAsync({family:'Inter',style:'Bold'})
  ]);

  await figma.loadAllPagesAsync();
  const existingPages=[...figma.root.children];
  shopPage=existingPages[0] || newPage('Balii — 01 Khách hàng');
  accountPage=existingPages[1] || newPage('Balii — 02 Tài khoản');
  adminPage=existingPages[2] || newPage('Balii — 03 Quản trị');
  shopPage.name='Balii — 01 Khách hàng';
  accountPage.name='Balii — 02 Tài khoản';
  adminPage.name='Balii — 03 Quản trị';
  designPage=shopPage;
  authPage=shopPage;

  [shopPage,accountPage,adminPage].forEach((page) => {
    page.children
      .filter((node) => node.type==='FRAME' && node.name.includes('•'))
      .forEach((node) => node.remove());
  });

  const designSystem=buildDesignSystem(shopPage);
  const shops=[buildHome(),buildListing('Sản phẩm','/products'),buildProductDetail(),buildCategoriesLanding(),buildCategoryDetail(),buildCollectionsLanding(),buildCollectionDetail(),buildSearch(),buildWishlistShop(),buildSimpleShop('So sánh sản phẩm','/compare','compare'),buildCart(),buildCheckout(),buildCheckout('Thanh toán VNPay','/checkout/vnpay','form'),buildCheckout('Đặt hàng thành công','/checkout/success','success'),buildCheckout('Kết quả thanh toán','/checkout/result','success'),buildTryOn(),buildSimpleShop('Liên hệ','/contact','contact'),buildSimpleShop('Câu hỏi thường gặp','/faq','faq')];
  const auths=[authScreen('Đăng nhập','/login','login'),authScreen('Đăng ký','/register','register'),authScreen('Quên mật khẩu','/forgot-password','forgot'),authScreen('Đặt lại mật khẩu','/reset-password','reset')];
  placeFrames(shopPage,[designSystem,...shops,...auths]);
  const accounts=[buildAccount('Hồ sơ cá nhân','/account/profile','profile'),buildAccount('Sổ địa chỉ','/account/addresses','address'),buildAccount('Đơn hàng','/account/orders','orders'),buildAccount('Chi tiết đơn hàng','/account/orders/BAL26071501','orderDetail'),buildAccount('Voucher của tôi','/account/vouchers','vouchers'),buildAccount('Sản phẩm yêu thích','/account/wishlist','wishlist'),buildAccount('Lịch sử thử đồ','/account/try-on-history','tryon')];placeFrames(accountPage,accounts);
  const admins=[dashboard(),adminProductsExact(),adminForm(),adminList('Danh mục','/admin/categories','category'),adminList('Bộ sưu tập','/admin/collections','collection'),adminList('Chiến dịch','/admin/campaigns','campaign'),adminList('Đơn hàng','/admin/orders','order'),adminSpecial('Workflow','/admin/workflows','workflow'),adminList('Voucher','/admin/vouchers','voucher'),adminList('Khách hàng','/admin/users','user'),adminMarketExact(),adminList('Kiểm tra hoàn tiền','/admin/refunds','refund'),adminSpecial('Cài đặt hệ thống','/admin/settings','settings')];placeFrames(adminPage,admins);

  figma.currentPage=designPage;figma.viewport.scrollAndZoomIntoView(designPage.children);
  figma.notify(`Đã tạo ${1+shops.length+auths.length+accounts.length+admins.length} màn hình Balii có thể chỉnh sửa.`);
  figma.closePlugin();
}

main().catch((error) => {
  figma.notify(`Không thể tạo giao diện: ${error.message}`);
  console.error(error);
  figma.closePlugin();
});
