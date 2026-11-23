const SUPABASE_URL = 'https://pryzkgoieerszhchruvj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bfYVRIpn6_RGOjWHJ1ksbQ_Bur2igBq';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let editingId = null;
let editingCustomerId = null;
let editingFollowupId = null;
let dealsForCommission = [];
let propertySearch = '';
let propertyStatusFilter = '';
let customerSearch = '';
/* ============ الإشعارات (Toasts) ============ */

function showToast(message, type) {
  let box = document.getElementById('toast-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toast-box';
    document.body.appendChild(box);
  }

  const icons = { success: '✅', error: '⛔', warning: '⚠️' };

  const toast = document.createElement('div');
  toast.className = 'toast ' + type;

  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.textContent = icons[type] || 'ℹ️';

  const text = document.createElement('span');
  text.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(text);
  box.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// أي alert في الكود بقى يظهر كإشعار
window.alert = function (message) {
  const msg = String(message);
  const type = msg.includes('خطأ') || msg.includes('مينفعش') ? 'error' : 'warning';
  showToast(msg, type);
};

/* ============ نافذة التأكيد ============ */

function confirmDialog(message) {

  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const box = document.createElement('div');
    box.className = 'modal-box';

    const icon = document.createElement('div');
    icon.className = 'modal-icon';
    icon.textContent = '🗑️';

    const title = document.createElement('h3');
    title.textContent = 'تأكيد الحذف';

    const text = document.createElement('p');
    text.textContent = message;

    const actions = document.createElement('div');
    actions.className = 'modal-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn-cancel';
    cancelBtn.textContent = 'إلغاء';

    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.className = 'btn-confirm';
    okBtn.textContent = 'نعم، احذف';

    const close = (result) => {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      resolve(result);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
    };

    cancelBtn.addEventListener('click', () => close(false));
    okBtn.addEventListener('click', () => close(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });
    document.addEventListener('keydown', onKey);

    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    box.appendChild(icon);
    box.appendChild(title);
    box.appendChild(text);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    cancelBtn.focus();
  });

  /* ============ نافذة تسجيل دفعة ============ */

function paymentDialog(remaining, customerName) {
  return new Promise(resolve => {
    const fmtN = n => Number(n).toLocaleString('en-US');

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const box = document.createElement('div');
    box.className = 'modal-box';

    const icon = document.createElement('div');
    icon.className = 'modal-icon pay';
    icon.textContent = '💰';

    const title = document.createElement('h3');
    title.textContent = 'تسجيل دفعة';

    const text = document.createElement('p');
    text.textContent = (customerName ? customerName + ' - ' : '') +
      'المتبقي ' + fmtN(remaining) + ' جنيه';

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '0.01';
    input.className = 'pay-input';
    input.placeholder = 'قيمة الدفعة';

    const quick = document.createElement('button');
    quick.type = 'button';
    quick.className = 'pay-quick';
    quick.textContent = 'سداد المتبقي كله';
    quick.addEventListener('click', () => {
      input.value = remaining;
      input.focus();
    });

    const error = document.createElement('div');
    error.className = 'pay-error';

    const actions = document.createElement('div');
    actions.className = 'modal-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn-cancel';
    cancelBtn.textContent = 'إلغاء';

    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.className = 'btn-ok';
    okBtn.textContent = 'تسجيل الدفعة';

    const close = (result) => {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      resolve(result);
    };

    const submit = () => {
      const value = parseFloat(input.value);
      if (isNaN(value) || value <= 0) {
        error.textContent = 'اكتب رقم صحيح أكبر من صفر';
        return;
      }
      if (value > remaining) {
        error.textContent = 'الدفعة أكبر من المتبقي (' + fmtN(remaining) + ' جنيه)';
        return;
      }
      close(value);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') close(null);
      if (e.key === 'Enter') submit();
    };

    cancelBtn.addEventListener('click', () => close(null));
    okBtn.addEventListener('click', submit);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(null);
    });
    document.addEventListener('keydown', onKey);

    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    box.appendChild(icon);
    box.appendChild(title);
    box.appendChild(text);
    box.appendChild(input);
    box.appendChild(quick);
    box.appendChild(error);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    input.focus();
  });
}
}

function paymentDialog(remaining, customerName) {
  return new Promise(resolve => {
    const fmtN = n => Number(n).toLocaleString('en-US');

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const box = document.createElement('div');
    box.className = 'modal-box';

    const icon = document.createElement('div');
    icon.className = 'modal-icon pay';
    icon.textContent = '💰';

    const title = document.createElement('h3');
    title.textContent = 'تسجيل دفعة';

    const text = document.createElement('p');
    text.textContent = (customerName ? customerName + ' - ' : '') +
      'المتبقي ' + fmtN(remaining) + ' جنيه';

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '0.01';
    input.className = 'pay-input';
    input.placeholder = 'قيمة الدفعة';

    const quick = document.createElement('button');
    quick.type = 'button';
    quick.className = 'pay-quick';
    quick.textContent = 'سداد المتبقي كله';
    quick.addEventListener('click', () => {
      input.value = remaining;
      input.focus();
    });

    const error = document.createElement('div');
    error.className = 'pay-error';

    const actions = document.createElement('div');
    actions.className = 'modal-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn-cancel';
    cancelBtn.textContent = 'إلغاء';

    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.className = 'btn-ok';
    okBtn.textContent = 'تسجيل الدفعة';

    const close = (result) => {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      resolve(result);
    };

    const submit = () => {
      const value = parseFloat(input.value);
      if (isNaN(value) || value <= 0) {
        error.textContent = 'اكتب رقم صحيح أكبر من صفر';
        return;
      }
      if (value > remaining) {
        error.textContent = 'الدفعة أكبر من المتبقي (' + fmtN(remaining) + ' جنيه)';
        return;
      }
      close(value);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') close(null);
      if (e.key === 'Enter') submit();
    };

    cancelBtn.addEventListener('click', () => close(null));
    okBtn.addEventListener('click', submit);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(null);
    });
    document.addEventListener('keydown', onKey);

    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    box.appendChild(icon);
    box.appendChild(title);
    box.appendChild(text);
    box.appendChild(input);
    box.appendChild(quick);
    box.appendChild(error);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    input.focus();
  });
}

document.getElementById('status').textContent = 'التطبيق شغال ✅';

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

/* ============ تحميل كل البيانات (بعد تسجيل الدخول بس) ============ */

function loadAll() {
  loadDashboard();
  loadProperties();
  loadCustomers();
  loadLinkOptions();
  loadLinks();
  loadFollowupOptions();
  loadFollowups();
  loadDueFollowups();
  loadDealOptions();
  loadDeals();
  loadCommissionOptions();
  loadCommissions();
}

/* ============ العقارات ============ */

const propertyStatusNames = {
  available: 'متاح',
  reserved: 'محجوز',
  sold: 'مباع'
};

async function loadProperties() {
  const { data, error } = await db.from('properties').select('*');

  if (error) {
    console.error('خطأ:', error);
    document.getElementById('status').textContent = 'حصل خطأ في قراءة العقارات';
    return;
  }

  const list = document.getElementById('properties-list');
  list.innerHTML = '';

  const term = propertySearch.trim().toLowerCase();
  const shown = data.filter(p =>
    [p.type, p.area, p.governorate, p.code, p.address].join(' ').toLowerCase().includes(term) &&
    (!propertyStatusFilter || p.status === propertyStatusFilter)
  );

  if (shown.length === 0) {
    list.textContent = 'مفيش عقارات مطابقة';
    return;
  }

  shown.forEach(p => {
    const item = document.createElement('div');
    item.className = 'property-card';

    const info = document.createElement('span');

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = p.type;

    const badge = document.createElement('span');
    badge.className = 'badge ' + p.status;
    badge.textContent = propertyStatusNames[p.status] || p.status;
    title.appendChild(badge);

    const place = document.createElement('div');
    place.className = 'card-sub';
    place.textContent = '📍 ' + ([p.area, p.governorate].filter(Boolean).join('، ') || 'المكان غير محدد');

    info.appendChild(title);
    info.appendChild(place);

    if (p.address) {
      const addr = document.createElement('div');
      addr.className = 'card-sub';
      addr.textContent = '🧭 ' + p.address;
      info.appendChild(addr);
    }

    const specs = [];
    if (p.area_m2)   specs.push('📐 ' + p.area_m2 + ' م²');
    if (p.rooms)     specs.push('🛏 ' + p.rooms + ' غرف');
    if (p.bathrooms) specs.push('🚿 ' + p.bathrooms + ' حمام');
    if (p.floor !== null && p.floor !== undefined) {
      specs.push('🏢 ' + (Number(p.floor) === 0 ? 'الأرضي' : 'الدور ' + p.floor));
    }
    if (p.finishing) specs.push('✨ ' + p.finishing);

    if (specs.length) {
      const spec = document.createElement('div');
      spec.className = 'card-sub';
      spec.textContent = specs.join('  ·  ');
      info.appendChild(spec);
    }

    const price = document.createElement('div');
    price.className = 'card-price';
    price.textContent = p.price
      ? Number(p.price).toLocaleString('en-US') + ' جنيه'
      : 'السعر غير محدد';
    info.appendChild(price);

    item.appendChild(info);

    const editBtn = document.createElement('button');
    editBtn.textContent = 'تعديل';
    editBtn.addEventListener('click', () => startEdit(p));

    const delBtn = document.createElement('button');
    delBtn.textContent = 'حذف';
    delBtn.addEventListener('click', () => deleteProperty(p.id));

    item.appendChild(editBtn);
    item.appendChild(delBtn);
    list.appendChild(item);
  });
}



document.getElementById('property-form').addEventListener('submit', async (e) => {
  e.preventDefault();

    const num = id => {
    const v = document.getElementById(id).value;
    return v === '' ? null : Number(v);
  };

  const newProperty = {
    type: document.getElementById('type').value,
    governorate: document.getElementById('governorate').value,
    area: document.getElementById('area').value,
    address: document.getElementById('address').value,
    price: num('price'),
    area_m2: num('area-m2'),
    rooms: num('rooms'),
    bathrooms: num('bathrooms'),
    floor: num('floor'),
    finishing: document.getElementById('finishing').value || null,
    status: document.getElementById('p-status').value
  };

  let error;
  if (editingId) {
    ({ error } = await db.from('properties').update(newProperty).eq('id', editingId));
  } else {
    ({ error } = await db.from('properties').insert(newProperty));
  }

  if (error) {
    console.error('خطأ في الحفظ:', error);
    alert('حصل خطأ في الحفظ');
    return;
  }

  e.target.reset();
  editingId = null;
  document.querySelector('#property-form button[type="submit"]').textContent = 'حفظ العقار';
  loadAll();
});

async function deleteProperty(id) {
if (!(await confirmDialog('متأكد إنك عايز تحذف العقار ده؟'))) return;
  const { error } = await db.from('properties').delete().eq('id', id);

  if (error) {
    console.error('خطأ في الحذف:', error);
    alert(error.code === '23503'
      ? 'مينفعش تحذف العقار ده لأن عليه صفقة'
      : 'حصل خطأ في الحذف');
    return;
  }

  loadAll();
}

function startEdit(p) {
  editingId = p.id;
  const set = (id, v) => { document.getElementById(id).value = v ?? ''; };
  set('type', p.type);
  set('governorate', p.governorate);
  set('area', p.area);
  set('address', p.address);
  set('price', p.price);
  set('area-m2', p.area_m2);
  set('rooms', p.rooms);
  set('bathrooms', p.bathrooms);
  set('floor', p.floor);
  set('finishing', p.finishing);
  set('p-status', p.status || 'available');
  document.querySelector('#property-form button[type="submit"]').textContent = 'حفظ التعديل';
  document.getElementById('property-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ============ العملاء ============ */

async function loadCustomers() {
  const { data, error } = await db.from('customers').select('*');

  if (error) {
    console.error('خطأ في قراءة العملاء:', error);
    return;
  }

  const list = document.getElementById('customers-list');
  list.innerHTML = '';

  if (data.length === 0) {
    list.textContent = 'لا يوجد عملاء بعد';
    return;
  }

  const term = customerSearch.trim().toLowerCase();
  const shown = data.filter(c =>
    [c.name, c.phone, c.preferred_area, c.preferred_type].join(' ').toLowerCase().includes(term)
  );

  if (shown.length === 0) {
    list.textContent = 'مفيش عملاء مطابقين';
    return;
  }

    shown.forEach(c => {
    const item = document.createElement('div');
    item.className = 'property-card';

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = (c.name || '?').trim().charAt(0);
    item.appendChild(avatar);

    const info = document.createElement('span');

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = c.name;

    const phone = document.createElement('div');
    phone.className = 'card-sub';
    phone.textContent = '📞 ' + (c.phone || 'بدون تليفون');

    const wantType = document.createElement('div');
    wantType.className = 'card-sub';
    wantType.textContent = '🔎 النوع المطلوب: ' + (c.preferred_type || '-');

    const wantArea = document.createElement('div');
    wantArea.className = 'card-sub';
    wantArea.textContent = '📍 المنطقة المطلوبة: ' + (c.preferred_area || '-');

    const budget = document.createElement('div');
    budget.className = 'card-price';
    budget.textContent = c.budget
      ? 'الميزانية: ' + Number(c.budget).toLocaleString('en-US') + ' جنيه'
      : 'الميزانية غير محددة';

    info.appendChild(title);
    info.appendChild(phone);
    info.appendChild(wantType);
    info.appendChild(wantArea);
    info.appendChild(budget);
    item.appendChild(info);

    // ===== أزرار الاتصال والواتساب =====
    const cleanPhone = (c.phone || '').replace(/[^\d+]/g, '');

    if (cleanPhone) {
      const actions = document.createElement('div');
      actions.className = 'contact-actions';

      const callLink = document.createElement('a');
      callLink.className = 'contact-btn call';
      callLink.href = 'tel:' + cleanPhone;
      callLink.textContent = '📞 اتصال';

      let waNumber = cleanPhone.replace(/^\+/, '');
      if (waNumber.startsWith('00')) waNumber = waNumber.slice(2);
      else if (waNumber.startsWith('0')) waNumber = '20' + waNumber.slice(1);

      const waLink = document.createElement('a');
      waLink.className = 'contact-btn wa';
      waLink.href = 'https://wa.me/' + waNumber;
      waLink.target = '_blank';
      waLink.rel = 'noopener';
      waLink.textContent = '💬 واتساب';

      actions.appendChild(callLink);
      actions.appendChild(waLink);
      item.appendChild(actions);
    }

    const editBtn = document.createElement('button');
    editBtn.textContent = 'تعديل';
    editBtn.addEventListener('click', () => startEditCustomer(c));

    const delBtn = document.createElement('button');
    delBtn.textContent = 'حذف';
    delBtn.addEventListener('click', () => deleteCustomer(c.id));

    item.appendChild(editBtn);
    item.appendChild(delBtn);
    list.appendChild(item);
  });
}
document.getElementById('customer-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const newCustomer = {
    name: document.getElementById('c-name').value,
    phone: document.getElementById('c-phone').value,
    budget: document.getElementById('c-budget').value || null,
    preferred_area: document.getElementById('c-area').value,
    preferred_type: document.getElementById('c-type').value
  };

  let error;
  if (editingCustomerId) {
    ({ error } = await db.from('customers').update(newCustomer).eq('id', editingCustomerId));
  } else {
    ({ error } = await db.from('customers').insert(newCustomer));
  }

  if (error) {
    console.error('خطأ في حفظ العميل:', error);
    alert('حصل خطأ في حفظ العميل');
    return;
  }

  e.target.reset();
  editingCustomerId = null;
  document.querySelector('#customer-form button[type="submit"]').textContent = 'حفظ العميل';
  loadAll();
});

async function deleteCustomer(id) {

if (!(await confirmDialog('متأكد إنك عايز تحذف العميل ده؟'))) return;
  const { error } = await db.from('customers').delete().eq('id', id);

  if (error) {
    console.error('خطأ في حذف العميل:', error);
    alert(error.code === '23503'
      ? 'مينفعش تحذف العميل ده لأن عليه صفقة'
      : 'حصل خطأ في الحذف');
    return;
  }

  loadAll();
}

function startEditCustomer(c) {
  editingCustomerId = c.id;
  document.getElementById('c-name').value = c.name || '';
  document.getElementById('c-phone').value = c.phone || '';
  document.getElementById('c-budget').value = c.budget || '';
  document.getElementById('c-area').value = c.preferred_area || '';
  document.getElementById('c-type').value = c.preferred_type || '';
  document.querySelector('#customer-form button[type="submit"]').textContent = 'حفظ التعديل';
}

/* ============ ربط العميل بالعقار ============ */

async function loadLinkOptions() {
  const { data: customers } = await db.from('customers').select('id, name');
  const { data: properties } = await db.from('properties').select('id, type, area');

  const cSelect = document.getElementById('link-customer');
  const pSelect = document.getElementById('link-property');
  cSelect.innerHTML = '<option value="">اختار العميل</option>';
  pSelect.innerHTML = '<option value="">اختار العقار</option>';

  (customers || []).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    cSelect.appendChild(opt);
  });

  (properties || []).forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.type} ${p.area || ''}`;
    pSelect.appendChild(opt);
  });
}

async function loadLinks() {
  const { data, error } = await db
    .from('customer_properties')
    .select('id, customers(name), properties(type, area)');

  if (error) {
    console.error('خطأ في قراءة الروابط:', error);
    return;
  }

  const list = document.getElementById('links-list');
  list.innerHTML = '';

  if (data.length === 0) {
    list.textContent = 'لا توجد روابط بعد';
    return;
  }

  data.forEach(l => {
    const item = document.createElement('div');
    item.className = 'property-card';

    const info = document.createElement('span');
    const cName = l.customers ? l.customers.name : '-';
    const pName = l.properties ? `${l.properties.type} ${l.properties.area || ''}` : '-';
    info.textContent = `${cName} مهتم بـ ${pName}`;
    item.appendChild(info);

    const delBtn = document.createElement('button');
    delBtn.textContent = 'حذف الربط';
    delBtn.addEventListener('click', async () => {
      await db.from('customer_properties').delete().eq('id', l.id);
      loadLinks();
    });
    item.appendChild(delBtn);

    list.appendChild(item);
  });
}

document.getElementById('link-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const { error } = await db.from('customer_properties').insert({
    customer_id: document.getElementById('link-customer').value,
    property_id: document.getElementById('link-property').value
  });

  if (error) {
    console.error('خطأ في الربط:', error);
    alert(error.code === '23505' ? 'العميل ده مربوط بالعقار ده بالفعل' : 'حصل خطأ في الربط');
    return;
  }

  loadLinks();
});

/* ============ المتابعات ============ */

const methodNames = {
  call: 'مكالمة',
  whatsapp: 'واتساب',
  visit: 'معاينة',
  meeting: 'مقابلة'
};

const methodIcons = {
  call: '📞',
  whatsapp: '💬',
  visit: '🏠',
  meeting: '🤝'
};

async function loadFollowupOptions() {
  const { data: customers } = await db.from('customers').select('id, name');
  const { data: properties } = await db.from('properties').select('id, type, area');

  const cSelect = document.getElementById('f-customer');
  const pSelect = document.getElementById('f-property');
  cSelect.innerHTML = '<option value="">اختار العميل</option>';
  pSelect.innerHTML = '<option value="">بدون عقار</option>';

  (customers || []).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    cSelect.appendChild(opt);
  });

  (properties || []).forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.type} ${p.area || ''}`;
    pSelect.appendChild(opt);
  });
}

async function loadFollowups() {
  const { data, error } = await db
    .from('follow_ups')
    .select('id, customer_id, property_id, method, result, next_follow_up, customers(name), properties(type, area)')    .order('created_at', { ascending: false });

  if (error) {
    console.error('خطأ في قراءة المتابعات:', error);
    return;
  }

  const list = document.getElementById('followups-list');
  list.innerHTML = '';

  if (data.length === 0) {
    list.textContent = 'لا توجد متابعات بعد';
    return;
  }

  data.forEach(f => {
    const item = document.createElement('div');
    item.className = 'property-card';

        const info = document.createElement('span');

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = f.customers ? f.customers.name : 'عميل غير معروف';

    const method = document.createElement('span');
    method.className = 'badge method';
    method.textContent = (methodIcons[f.method] || '') + ' ' + (methodNames[f.method] || f.method);
    title.appendChild(method);

    const prop = document.createElement('div');
    prop.className = 'card-sub';
    prop.textContent = '🏠 العقار: ' + (f.properties ? f.properties.type + ' ' + (f.properties.area || '') : 'بدون');

    const result = document.createElement('div');
    result.className = 'card-sub';
    result.textContent = '📝 النتيجة: ' + (f.result || '-');

    const next = document.createElement('div');
    next.className = 'card-sub';
    next.textContent = '📅 المتابعة القادمة: ' + (f.next_follow_up || '-');

    info.appendChild(title);
    info.appendChild(prop);
    info.appendChild(result);
    info.appendChild(next);
    item.appendChild(info);

        const editBtn = document.createElement('button');
    editBtn.textContent = 'تعديل';
    editBtn.addEventListener('click', () => startEditFollowup(f));
    item.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.textContent = 'حذف';
    delBtn.addEventListener('click', async () => {
if (!(await confirmDialog('متأكد إنك عايز تحذف المتابعة دي؟'))) return;     
 await db.from('follow_ups').delete().eq('id', f.id);
      loadFollowups();
      loadDueFollowups();
      loadDashboard();
    });
    item.appendChild(delBtn);

    list.appendChild(item);
  });
}

document.getElementById('followup-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const followup = {
    customer_id: document.getElementById('f-customer').value,
    property_id: document.getElementById('f-property').value || null,
    method: document.getElementById('f-method').value,
    result: document.getElementById('f-result').value,
    next_follow_up: document.getElementById('f-next').value || null
  };

  let error;
  if (editingFollowupId) {
    ({ error } = await db.from('follow_ups').update(followup).eq('id', editingFollowupId));
  } else {
    ({ error } = await db.from('follow_ups').insert(followup));
  }

  if (error) {
    console.error('خطأ في حفظ المتابعة:', error);
    alert('حصل خطأ في حفظ المتابعة');
    return;
  }

  e.target.reset();
  editingFollowupId = null;
  document.querySelector('#followup-form button[type="submit"]').textContent = 'حفظ المتابعة';
  showToast('تم حفظ المتابعة ✔', 'success');
  loadFollowups();
  loadDueFollowups();
  loadDashboard();
  refreshBell();
});

function startEditFollowup(f) {
  editingFollowupId = f.id;
  document.getElementById('f-customer').value = f.customer_id || '';
  document.getElementById('f-property').value = f.property_id || '';
  document.getElementById('f-method').value = f.method || 'call';
  document.getElementById('f-result').value = f.result || '';
  document.getElementById('f-next').value = f.next_follow_up || '';
  document.querySelector('#followup-form button[type="submit"]').textContent = 'حفظ التعديل';
  document.getElementById('followup-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function loadDueFollowups() {
  const today = new Date();
  const todayStr = today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0');

  const { data, error } = await db
    .from('follow_ups')
    .select('id, method, result, next_follow_up, customers(name, phone)')
    .lte('next_follow_up', todayStr)
    .order('next_follow_up', { ascending: true });

  if (error) {
    console.error('خطأ في قراءة المتابعات المستحقة:', error);
    return;
  }

  const list = document.getElementById('due-list');
  list.innerHTML = '';

  if (data.length === 0) {
    list.textContent = 'مفيش متابعات مستحقة النهاردة 👌';
    return;
  }

  data.forEach(f => {
    const item = document.createElement('div');
    item.className = 'property-card';

        const isLate = f.next_follow_up < todayStr;
    item.classList.add(isLate ? 'late' : 'today');

    const info = document.createElement('span');

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = f.customers ? f.customers.name : 'عميل غير معروف';

    const state = document.createElement('span');
    state.className = 'badge ' + (isLate ? 'late' : 'today');
    state.textContent = isLate ? '⚠️ متأخرة' : '🔔 النهاردة';
    title.appendChild(state);

    const phone = document.createElement('div');
    phone.className = 'card-sub';
    phone.textContent = '📞 ' + (f.customers && f.customers.phone ? f.customers.phone : 'بدون تليفون');

    const date = document.createElement('div');
    date.className = 'card-sub';
    date.textContent = '📅 الموعد: ' + f.next_follow_up;

    info.appendChild(title);
    info.appendChild(phone);
        info.appendChild(date);
    item.appendChild(info);

    const duePhone = (f.customers && f.customers.phone ? f.customers.phone : '').replace(/[^\d+]/g, '');
    if (duePhone) {
      const actions = document.createElement('div');
      actions.className = 'contact-actions';

      const callLink = document.createElement('a');
      callLink.className = 'contact-btn call';
      callLink.href = 'tel:' + duePhone;
      callLink.textContent = '📞 اتصال';

      let wa = duePhone.replace(/^\+/, '');
      if (wa.startsWith('00')) wa = wa.slice(2);
      else if (wa.startsWith('0')) wa = '20' + wa.slice(1);

      const waLink = document.createElement('a');
      waLink.className = 'contact-btn wa';
      waLink.href = 'https://wa.me/' + wa;
      waLink.target = '_blank';
      waLink.rel = 'noopener';
      waLink.textContent = '💬 واتساب';

      actions.appendChild(callLink);
      actions.appendChild(waLink);
      item.appendChild(actions);
    }

    list.appendChild(item);
  });
}

/* ============ الصفقات ============ */

const dealStatusNames = {
  negotiating: 'تفاوض',
  completed: 'مكتملة',
  cancelled: 'ملغاة'
};

async function loadDealOptions() {
  const { data: customers } = await db.from('customers').select('id, name');
  const { data: properties } = await db.from('properties').select('id, type, area');

  const cSelect = document.getElementById('d-customer');
  const pSelect = document.getElementById('d-property');
  cSelect.innerHTML = '<option value="">اختار العميل</option>';
  pSelect.innerHTML = '<option value="">اختار العقار</option>';

  (customers || []).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    cSelect.appendChild(opt);
  });

  (properties || []).forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.type} ${p.area || ''}`;
    pSelect.appendChild(opt);
  });
}

async function loadDeals() {
  const { data, error } = await db
    .from('deals')
    .select('id, agreed_price, deal_date, status, notes, customers(name), properties(type, area)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('خطأ في قراءة الصفقات:', error);
    return;
  }

  const list = document.getElementById('deals-list');
  list.innerHTML = '';

  if (data.length === 0) {
    list.textContent = 'لا توجد صفقات بعد';
    return;
  }

  data.forEach(d => {
    const item = document.createElement('div');
    item.className = 'property-card';

        const info = document.createElement('span');

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = d.customers ? d.customers.name : 'عميل غير معروف';

    const badge = document.createElement('span');
    badge.className = 'badge ' + d.status;
    badge.textContent = dealStatusNames[d.status] || d.status;
    title.appendChild(badge);

    const prop = document.createElement('div');
    prop.className = 'card-sub';
    prop.textContent = '🏠 العقار: ' + (d.properties ? d.properties.type + ' ' + (d.properties.area || '') : '-');

    const date = document.createElement('div');
    date.className = 'card-sub';
    date.textContent = '📅 التاريخ: ' + d.deal_date;

    const price = document.createElement('div');
    price.className = 'card-price';
    price.textContent = d.agreed_price
      ? 'السعر المتفق عليه: ' + Number(d.agreed_price).toLocaleString('en-US') + ' جنيه'
      : 'السعر غير محدد';

    info.appendChild(title);
    info.appendChild(prop);
    info.appendChild(date);
    info.appendChild(price);

    if (d.notes) {
      const notes = document.createElement('div');
      notes.className = 'card-sub';
      notes.textContent = '📝 ' + d.notes;
      info.appendChild(notes);
    }

    item.appendChild(info);

    const statusSelect = document.createElement('select');
    Object.keys(dealStatusNames).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = dealStatusNames[key];
      if (key === d.status) opt.selected = true;
      statusSelect.appendChild(opt);
    });
    statusSelect.addEventListener('change', async () => {
      const { error } = await db
        .from('deals')
        .update({ status: statusSelect.value })
        .eq('id', d.id);

      if (error) {
        console.error('خطأ في تغيير الحالة:', error);
        alert(error.code === '23505'
          ? 'العقار ده عليه صفقة مكتملة بالفعل'
          : 'حصل خطأ في تغيير الحالة');
      }
      loadAll();
    });
    item.appendChild(statusSelect);

    const delBtn = document.createElement('button');
    delBtn.textContent = 'حذف';
    delBtn.addEventListener('click', async () => {
if (!(await confirmDialog('متأكد إنك عايز تحذف الصفقة دي؟'))) return;
      const { error } = await db.from('deals').delete().eq('id', d.id);
      if (error) {
        console.error('خطأ في حذف الصفقة:', error);
        alert('حصل خطأ في الحذف');
        return;
      }
      loadAll();
    });
    item.appendChild(delBtn);

    list.appendChild(item);
  });
}

document.getElementById('deal-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const newDeal = {
    customer_id: document.getElementById('d-customer').value,
    property_id: document.getElementById('d-property').value,
    agreed_price: document.getElementById('d-price').value || null,
    status: document.getElementById('d-status').value,
    notes: document.getElementById('d-notes').value
  };

  const dealDate = document.getElementById('d-date').value;
  if (dealDate) newDeal.deal_date = dealDate;

  const { error } = await db.from('deals').insert(newDeal);

  if (error) {
    console.error('خطأ في حفظ الصفقة:', error);
    alert(error.code === '23505'
      ? 'العقار ده عليه صفقة مكتملة بالفعل'
      : 'حصل خطأ في حفظ الصفقة');
    return;
  }

  e.target.reset();
  loadAll();
});

/* ============ العمولات ============ */

async function loadCommissionOptions() {
  const { data: deals } = await db
    .from('deals')
    .select('id, agreed_price, customers(name), properties(type, area)');
  const { data: existing } = await db.from('commissions').select('deal_id');

  const usedIds = (existing || []).map(c => c.deal_id);
  dealsForCommission = (deals || []).filter(d => !usedIds.includes(d.id));

  const select = document.getElementById('cm-deal');
  select.innerHTML = '<option value="">اختار الصفقة</option>';

  dealsForCommission.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    const cName = d.customers ? d.customers.name : '-';
    const pName = d.properties ? `${d.properties.type} ${d.properties.area || ''}` : '-';
    opt.textContent = `${cName} - ${pName} - ${d.agreed_price || 0} جنيه`;
    select.appendChild(opt);
  });
}

async function loadCommissions() {
  const { data, error } = await db
    .from('commissions')
    .select('id, percentage, amount, paid, remaining, deals(agreed_price, customers(name), properties(type, area))')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('خطأ في قراءة العمولات:', error);
    return;
  }

  const list = document.getElementById('commissions-list');
  list.innerHTML = '';

  if (data.length === 0) {
    list.textContent = 'لا توجد عمولات بعد';
    return;
  }

  data.forEach(c => {
    const item = document.createElement('div');
    item.className = 'property-card';

    const deal = c.deals;
        const amount = Number(c.amount) || 0;
    const paidVal = Number(c.paid) || 0;
    const remainingVal = Number(c.remaining) || 0;
    const pct = amount > 0 ? Math.min(100, Math.round((paidVal / amount) * 100)) : 0;
    const fmtN = n => Number(n).toLocaleString('en-US');

    const info = document.createElement('span');

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = deal && deal.customers ? deal.customers.name : 'عميل غير معروف';

    const badge = document.createElement('span');
    if (amount > 0 && remainingVal === 0) {
      badge.className = 'badge paid';
      badge.textContent = '✅ مسدّدة';
    } else if (paidVal > 0) {
      badge.className = 'badge partial';
      badge.textContent = 'مدفوعة جزئيًا';
    } else {
      badge.className = 'badge unpaid';
      badge.textContent = 'لم تُسدَّد';
    }
    title.appendChild(badge);

    const prop = document.createElement('div');
    prop.className = 'card-sub';
    prop.textContent = '🏠 العقار: ' + (deal && deal.properties ? deal.properties.type + ' ' + (deal.properties.area || '') : '-');

    const total = document.createElement('div');
    total.className = 'card-price';
    total.textContent = 'العمولة: ' + fmtN(amount) + ' جنيه (' + c.percentage + '%)';

    const bar = document.createElement('div');
    bar.className = 'progress';
    const fill = document.createElement('div');
    fill.className = 'progress-fill';
    fill.style.width = pct + '%';
    bar.appendChild(fill);

    const details = document.createElement('div');
    details.className = 'card-sub';
    details.textContent = 'المحصّل ' + fmtN(paidVal) + ' جنيه (' + pct + '%) - المتبقي ' + fmtN(remainingVal) + ' جنيه';

    info.appendChild(title);
    info.appendChild(prop);
    info.appendChild(total);
    info.appendChild(bar);
    info.appendChild(details);
    item.appendChild(info);

        const payBtn = document.createElement('button');
    payBtn.textContent = 'تسجيل دفعة';
    payBtn.addEventListener('click', async () => {
      const remaining = Number(c.remaining) || 0;
      if (remaining <= 0) {
        alert('العمولة دي مسدّدة بالكامل');
        return;
      }

      const customerName = deal && deal.customers ? deal.customers.name : '';
      const payment = await paymentDialog(remaining, customerName);
      if (payment === null) return;

      const { error } = await db
        .from('commissions')
        .update({ paid: Number(c.paid) + payment })
        .eq('id', c.id);

      if (error) {
        console.error('خطأ في تسجيل الدفعة:', error);
        alert('حصل خطأ في تسجيل الدفعة');
        return;
      }

      showToast('تم تسجيل الدفعة ✔', 'success');
      loadCommissions();
      loadDashboard();
    });
    item.appendChild(payBtn);

    const delBtn = document.createElement('button');
    delBtn.textContent = 'حذف';
    delBtn.addEventListener('click', async () => {
if (!(await confirmDialog('متأكد إنك عايز تحذف العمولة دي؟'))) return;
      const { error } = await db.from('commissions').delete().eq('id', c.id);
      if (error) {
        console.error('خطأ في حذف العمولة:', error);
        alert('حصل خطأ في الحذف');
        return;
      }
      loadCommissions();
      loadCommissionOptions();
      loadDashboard();
    });
    item.appendChild(delBtn);

    list.appendChild(item);
  });
}

document.getElementById('commission-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const dealId = document.getElementById('cm-deal').value;
  const deal = dealsForCommission.find(d => d.id === dealId);
  const percentage = parseFloat(document.getElementById('cm-percentage').value);
  const paid = parseFloat(document.getElementById('cm-paid').value) || 0;

  if (!deal) {
    alert('اختار الصفقة الأول');
    return;
  }

  const price = Number(deal.agreed_price) || 0;
  const amount = Math.round(price * percentage) / 100;

  if (paid > amount) {
    alert('المدفوع أكبر من قيمة العمولة');
    return;
  }

  const { error } = await db.from('commissions').insert({
    deal_id: dealId,
    percentage: percentage,
    amount: amount,
    paid: paid
  });

  if (error) {
    console.error('خطأ في حفظ العمولة:', error);
    alert(error.code === '23505'
      ? 'الصفقة دي ليها عمولة بالفعل'
      : 'حصل خطأ في حفظ العمولة');
    return;
  }

  e.target.reset();
  loadCommissions();
  loadCommissionOptions();
  loadDashboard();
});

/* ============ لوحة التحكم ============ */

async function loadDashboard() {
  const { data: properties } = await db.from('properties').select('status');
  const { count: customersCount } = await db
    .from('customers')
    .select('*', { count: 'exact', head: true });

  const props = properties || [];

  const now = new Date();
  const todayStr = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');

  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count: newCustomers } = await db
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekAgo);

  const { count: dueCount } = await db
    .from('follow_ups')
    .select('*', { count: 'exact', head: true })
    .lte('next_follow_up', todayStr);

  const { count: completedDeals } = await db
    .from('deals')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed');

  const { data: commissions } = await db.from('commissions').select('amount, paid, remaining');  const totalCommissions = (commissions || [])
    .reduce((sum, c) => sum + Number(c.amount), 0);

    const stats = [
    { label: 'إجمالي العقارات', value: props.length, icon: '🏢', color: 'blue' },
    { label: 'متاحة', value: props.filter(p => p.status === 'available').length, icon: '✅', color: 'green' },
    { label: 'محجوزة', value: props.filter(p => p.status === 'reserved').length, icon: '⏳', color: 'orange' },
    { label: 'مباعة', value: props.filter(p => p.status === 'sold').length, icon: '🏷️', color: 'red' },
    { label: 'إجمالي العملاء', value: customersCount || 0, icon: '👥', color: 'purple' },
    { label: 'عملاء جدد (7 أيام)', value: newCustomers || 0, icon: '🆕', color: 'teal' },
    { label: 'متابعات مستحقة', value: dueCount || 0, icon: '📞', color: 'orange' },
    { label: 'صفقات مكتملة', value: completedDeals || 0, icon: '🤝', color: 'green' },
    { label: 'إجمالي العمولات', value: totalCommissions.toLocaleString('en-US') + ' جنيه', icon: '💰', color: 'gold' }
  ];

  const box = document.getElementById('dashboard');
  box.innerHTML = '';

  stats.forEach(s => {
    const card = document.createElement('div');
    card.className = 'stat-card has-icon ' + s.color;

    const icon = document.createElement('div');
    icon.className = 'stat-icon';
    icon.textContent = s.icon;

    const body = document.createElement('div');

    const num = document.createElement('div');
    num.className = 'stat-number';
    num.textContent = s.value;

    const label = document.createElement('div');
    label.className = 'stat-label';
    label.textContent = s.label;

    body.appendChild(num);
    body.appendChild(label);
    card.appendChild(icon);
    card.appendChild(body);
    box.appendChild(card);
  });
    const sumOf = key => (commissions || []).reduce((t, c) => t + Number(c[key] || 0), 0);

  drawDoughnut(
    'chart-properties',
    ['متاحة', 'محجوزة', 'مباعة'],
    [
      props.filter(p => p.status === 'available').length,
      props.filter(p => p.status === 'reserved').length,
      props.filter(p => p.status === 'sold').length
    ],
    ['#16a34a', '#d97706', '#dc2626']
  );

    const cAmount = sumOf('amount');
  const cRate = cAmount > 0 ? Math.round((sumOf('paid') / cAmount) * 100) : 0;

  drawDoughnut(
    'chart-commissions',
    ['المحصّل', 'المتبقي'],
    [sumOf('paid'), sumOf('remaining')],
    ['#16a34a', '#f59e0b'],
    { value: cRate + '%', label: 'نسبة التحصيل' }
  );

  loadTrend();
}

function hideSplash() {
  const s = document.getElementById('splash');
  if (!s) return;
  s.classList.add('hide');
  setTimeout(() => s.remove(), 500);
}

/* ============ تسجيل الدخول والخروج ============ */

const loginBox = document.getElementById('login-box');
const appBox = document.getElementById('app');

async function showApp(loggedIn) {
  loginBox.style.display = loggedIn ? 'none' : 'block';
  appBox.style.display = loggedIn ? 'block' : 'none';
  if (loggedIn) {
    showWelcome();
    await Promise.allSettled([
      loadDashboard(),
      loadProperties(),
      loadCustomers(),
      loadDueFollowups()
    ]);
    loadAll();
  }
  hideSplash();
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const { error } = await db.auth.signInWithPassword({
    email: document.getElementById('login-email').value,
    password: document.getElementById('login-password').value
  });

  const errorBox = document.getElementById('login-error');
  if (error) {
    console.error('خطأ في الدخول:', error);
    errorBox.textContent = 'الإيميل أو كلمة السر غلط';
    return;
  }

  errorBox.textContent = '';
  e.target.reset();
  showApp(true);
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await db.auth.signOut();
  showApp(false);
});

db.auth.getSession().then(({ data }) => {
  showApp(!!data.session);
});
setTimeout(hideSplash, 8000);

document.getElementById('property-search').addEventListener('input', (e) => {
  propertySearch = e.target.value;
  loadProperties();
});

document.getElementById('property-status-filter').addEventListener('change', (e) => {
  propertyStatusFilter = e.target.value;
  loadProperties();
});

document.getElementById('customer-search').addEventListener('input', (e) => {
  customerSearch = e.target.value;
  loadCustomers();
});

function toDateStr(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const now = new Date();
    let from;
    if (chip.dataset.range === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (chip.dataset.range === 'year') {
      from = new Date(now.getFullYear(), 0, 1);
    } else {
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    document.getElementById('r-from').value = toDateStr(from);
    document.getElementById('r-to').value = toDateStr(now);
    document.getElementById('report-form').requestSubmit();
  });
});

document.getElementById('report-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const from = document.getElementById('r-from').value;
  const to = document.getElementById('r-to').value;

  if (from > to) {
    alert('تاريخ البداية لازم يكون قبل تاريخ النهاية');
    return;
  }

  const fromTs = new Date(from + 'T00:00:00').toISOString();
  const toTs = new Date(to + 'T23:59:59.999').toISOString();

  const countIn = async (table) => {
    const { count } = await db
      .from(table)
      .select('*', { count: 'exact', head: true })
      .gte('created_at', fromTs)
      .lte('created_at', toTs);
    return count || 0;
  };

  const newCustomers = await countIn('customers');
  const newProperties = await countIn('properties');
  const followupsCount = await countIn('follow_ups');

  const { data: deals, error: dealsError } = await db
    .from('deals')
    .select('agreed_price')
    .eq('status', 'completed')
    .gte('deal_date', from)
    .lte('deal_date', to);

  const { data: commissions, error: commError } = await db
    .from('commissions')
    .select('amount, paid, remaining')
    .gte('created_at', fromTs)
    .lte('created_at', toTs);

  if (dealsError || commError) {
    console.error('خطأ في التقرير:', dealsError || commError);
    alert('حصل خطأ في عرض التقرير');
    return;
  }

  const sum = (arr, key) => (arr || []).reduce((t, x) => t + Number(x[key] || 0), 0);
  const fmt = n => n.toLocaleString('en-US') + ' جنيه';

  const totalAmount = sum(commissions, 'amount');
  const totalPaid = sum(commissions, 'paid');
  const totalRemaining = sum(commissions, 'remaining');
  const rate = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;
  const dealsCount = (deals || []).length;

  const stats = [
    { label: 'عملاء جدد', value: newCustomers, icon: '👥', color: 'purple' },
    { label: 'عقارات جديدة', value: newProperties, icon: '🏢', color: 'blue' },
    { label: 'متابعات مسجلة', value: followupsCount, icon: '📞', color: 'orange' },
    { label: 'صفقات مكتملة', value: dealsCount, icon: '🤝', color: 'green' },
    { label: 'إجمالي قيمة الصفقات', value: fmt(sum(deals, 'agreed_price')), icon: '💼', color: 'teal' },
    { label: 'عمولات الفترة', value: fmt(totalAmount), icon: '💰', color: 'gold' },
    { label: 'المحصّل منها', value: fmt(totalPaid), icon: '✅', color: 'green' },
    { label: 'المتبقي', value: fmt(totalRemaining), icon: '⏳', color: 'red' },
    { label: 'نسبة التحصيل', value: rate + '%', icon: '📊', color: 'blue' }
  ];

  document.getElementById('report-empty').style.display = 'none';
  document.getElementById('report-output').style.display = 'block';

  const box = document.getElementById('report-result');
  box.innerHTML = '';

  stats.forEach(s => {
    const card = document.createElement('div');
    card.className = 'stat-card has-icon ' + s.color;

    const icon = document.createElement('div');
    icon.className = 'stat-icon';
    icon.textContent = s.icon;

    const body = document.createElement('div');

    const num = document.createElement('div');
    num.className = 'stat-number';
    num.textContent = s.value;

    const label = document.createElement('div');
    label.className = 'stat-label';
    label.textContent = s.label;

    body.appendChild(num);
    body.appendChild(label);
    card.appendChild(icon);
    card.appendChild(body);
    box.appendChild(card);
  });

  drawBar(
    'chart-report-activity',
    ['عملاء جدد', 'عقارات جديدة', 'متابعات', 'صفقات مكتملة'],
    [newCustomers, newProperties, followupsCount, dealsCount],
    ['#7c3aed', '#2563eb', '#d97706', '#16a34a']
  );

    drawDoughnut(
    'chart-report-commissions',
    ['المحصّل', 'المتبقي'],
    [totalPaid, totalRemaining],
    ['#16a34a', '#f59e0b'],
    { value: rate + '%', label: 'نسبة التحصيل' }
  );
});

/* ============ الرسوم البيانية ============ */

Chart.defaults.font.family = "'Cairo', Tahoma, sans-serif";
Chart.defaults.color = '#64748b';

const charts = {};

const tooltipStyle = {
  rtl: true,
  textDirection: 'rtl',
  backgroundColor: '#0f172a',
  padding: 12,
  cornerRadius: 10,
  boxPadding: 5,
  titleFont: { weight: '700' },
  bodyFont: { size: 13 }
};

function makeGradient(ctx, area, color) {
  const g = ctx.createLinearGradient(0, area.bottom, 0, area.top);
  g.addColorStop(0, color + '33');
  g.addColorStop(1, color);
  return g;
}

function drawDoughnut(canvasId, labels, values, colors, center) {
  if (charts[canvasId]) charts[canvasId].destroy();

  const total = values.reduce((a, b) => a + b, 0);
  const isEmpty = total === 0;
  const centerValue = center ? center.value : total.toLocaleString('en-US');
  const centerLabel = center ? center.label : 'الإجمالي';

  const centerText = {
    id: 'centerText',
    afterDraw(chart) {
      const { ctx, chartArea: a } = chart;
      const x = (a.left + a.right) / 2;
      const y = (a.top + a.bottom) / 2;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0f172a';
      ctx.font = "700 28px 'Cairo'";
      ctx.fillText(centerValue, x, y - 8);
      ctx.fillStyle = '#64748b';
      ctx.font = "600 13px 'Cairo'";
      ctx.fillText(isEmpty ? 'لا توجد بيانات' : centerLabel, x, y + 18);
      ctx.restore();
    }
  };

  charts[canvasId] = new Chart(document.getElementById(canvasId), {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: isEmpty ? [1] : values,
        backgroundColor: isEmpty ? ['#e2e8f0'] : colors,
        borderWidth: 0,
        borderRadius: 8,
        spacing: 4,
        hoverOffset: 8
      }]
    },
    options: {
      maintainAspectRatio: false,
      layout: { padding: { bottom: 10 } },
      cutout: '74%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 13 } }
        },
                tooltip: Object.assign({}, tooltipStyle, {
          enabled: !isEmpty,
          position: 'nearest',
          yAlign: 'bottom',
          caretPadding: 14,
          displayColors: false,
          backgroundColor: 'rgba(15, 23, 42, 0.96)',
          callbacks: {
            label: c => c.label + ': ' + c.parsed.toLocaleString('en-US') +
              ' (' + Math.round((c.parsed / total) * 100) + '%)'
          }
        })
      }
    },
    plugins: [centerText]
  });
}

const barValueLabels = {
  id: 'barValueLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    ctx.save();
    ctx.font = "700 13px 'Cairo'";
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    chart.getDatasetMeta(0).data.forEach((bar, i) => {
      ctx.fillText(chart.data.datasets[0].data[i], bar.x, bar.y - 8);
    });
    ctx.restore();
  }
};

function drawBar(canvasId, labels, values, colors) {
  if (charts[canvasId]) charts[canvasId].destroy();

  charts[canvasId] = new Chart(document.getElementById(canvasId), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: ctx => {
          const { chart } = ctx;
          const color = colors[ctx.dataIndex % colors.length];
          return chart.chartArea ? makeGradient(chart.ctx, chart.chartArea, color) : color;
        },
        borderRadius: 10,
        borderSkipped: false,
        maxBarThickness: 56
      }]
    },
    options: {
      maintainAspectRatio: false,
      layout: { padding: { top: 24 } },
      plugins: {
        legend: { display: false },
        tooltip: tooltipStyle
      },
      scales: {
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: '#eef1f6', borderDash: [4, 4] },
          ticks: { precision: 0 }
        },
        x: { border: { display: false }, grid: { display: false } }
      }
    },
    plugins: [barValueLabels]
  });
}

function drawTrend(labels, commissionValues, dealValues) {
  if (charts['chart-trend']) charts['chart-trend'].destroy();

  charts['chart-trend'] = new Chart(document.getElementById('chart-trend'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          type: 'line',
          label: 'العمولات (جنيه)',
          data: commissionValues,
          borderColor: '#4f46e5',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          backgroundColor: ctx => {
            const { chart } = ctx;
            return chart.chartArea ? makeGradient(chart.ctx, chart.chartArea, '#4f46e5') : '#4f46e533';
          },
          pointBackgroundColor: '#fff',
          pointBorderColor: '#4f46e5',
          pointBorderWidth: 3,
          pointRadius: 5,
          pointHoverRadius: 7,
          yAxisID: 'y',
          order: 1
        },
        {
          type: 'bar',
          label: 'صفقات مكتملة',
          data: dealValues,
          backgroundColor: '#bbf7d0',
          borderRadius: 8,
          maxBarThickness: 36,
          yAxisID: 'y1',
          order: 2
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: { usePointStyle: true, pointStyle: 'circle', padding: 18, font: { size: 13 } }
        },
        tooltip: tooltipStyle
      },
      scales: {
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: '#eef1f6', borderDash: [4, 4] },
          ticks: { callback: v => v.toLocaleString('en-US') }
        },
        y1: {
          beginAtZero: true,
          position: 'left',
          border: { display: false },
          grid: { drawOnChartArea: false },
          ticks: { precision: 0 }
        },
        x: { border: { display: false }, grid: { display: false } }
      }
    }
  });
}

async function loadTrend() {
  const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const keyOf = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');

  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: keyOf(d), label: monthNames[d.getMonth()] });
  }

  const { data: comms } = await db.from('commissions').select('amount, created_at');
  const { data: deals } = await db.from('deals').select('deal_date').eq('status', 'completed');

  const commByMonth = {};
  const dealsByMonth = {};

  (comms || []).forEach(c => {
    const k = keyOf(new Date(c.created_at));
    commByMonth[k] = (commByMonth[k] || 0) + Number(c.amount || 0);
  });

  (deals || []).forEach(d => {
    const k = String(d.deal_date).slice(0, 7);
    dealsByMonth[k] = (dealsByMonth[k] || 0) + 1;
  });

  drawTrend(
    months.map(m => m.label),
    months.map(m => commByMonth[m.key] || 0),
    months.map(m => dealsByMonth[m.key] || 0)
  );
}

function showWelcome() {
  const h = new Date().getHours();
  const greet = h < 12 ? 'صباح الخير' : h < 18 ? 'مساء الخير' : 'مساء النور';
  document.getElementById('welcome-title').textContent = greet + ' 👋';
  document.getElementById('welcome-date').textContent =
    new Date().toLocaleDateString('ar-EG', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
}

const themeBtn = document.getElementById('theme-btn');

function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  themeBtn.textContent = t === 'dark' ? '☀️ الوضع الفاتح' : '🌙 الوضع الليلي';
  try { localStorage.setItem('theme', t); } catch (e) {}
}

let savedTheme = 'light';
try { savedTheme = localStorage.getItem('theme') || 'light'; } catch (e) {}
applyTheme(savedTheme);

themeBtn.addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

/* ===== الخطوة 85: أرقام متحركة + إضاءة الماوس ===== */
function animateCounters(box) {
  box.querySelectorAll('.stat-number').forEach(el => {
    const m = el.textContent.match(/^([\d,]+(?:\.\d+)?)(.*)$/);
    if (!m) return;

    const target = Number(m[1].replace(/,/g, ''));
    const suffix = m[2];
    if (!target) return;

    const start = performance.now();
    const duration = 900;

    const tick = now => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = t < 1 ? Math.round(target * eased) : target;
      el.textContent = value.toLocaleString('en-US', { maximumFractionDigits: 2 }) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

['dashboard', 'report-result'].forEach(id => {
  const box = document.getElementById(id);
  if (!box) return;
  new MutationObserver(() => animateCounters(box)).observe(box, { childList: true });
});

document.addEventListener('mousemove', e => {
  const card = e.target.closest && e.target.closest('.property-card, .chart-box');
  if (!card) return;
  const r = card.getBoundingClientRect();
  card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
  card.style.setProperty('--my', (e.clientY - r.top) + 'px');
});

/* ===== الخطوة 86: بحث سريع + جرس المتابعات ===== */
const appRoot = document.getElementById('app');

function goTab(name) {
  const b = document.querySelector('.tab-btn[data-tab="' + name + '"]');
  if (b) b.click();
}

const dock = document.createElement('div');
dock.id = 'dock';

const searchBtn = document.createElement('button');
searchBtn.type = 'button';
searchBtn.className = 'dock-btn';
searchBtn.innerHTML = '🔍 <span class="dock-text">بحث سريع</span><kbd>Ctrl K</kbd>';

const bellWrap = document.createElement('div');
bellWrap.className = 'bell-wrap';

const bellBtn = document.createElement('button');
bellBtn.type = 'button';
bellBtn.className = 'dock-btn bell';
bellBtn.textContent = '🔔';

const bellBadge = document.createElement('span');
bellBadge.className = 'bell-badge';
bellBadge.style.display = 'none';
bellBtn.appendChild(bellBadge);

const bellMenu = document.createElement('div');
bellMenu.className = 'bell-menu';
bellMenu.style.display = 'none';

bellWrap.appendChild(bellBtn);
bellWrap.appendChild(bellMenu);
dock.appendChild(searchBtn);
dock.appendChild(bellWrap);
const host = document.querySelector('main, #main, .main, .content');
if (host) {
  dock.classList.add('inline');
  host.prepend(dock);
} else {
  document.body.appendChild(dock);
}
function syncDock() {
  dock.style.display = appRoot.style.display === 'none' ? 'none' : 'flex';
}
new MutationObserver(syncDock).observe(appRoot, { attributes: true, attributeFilter: ['style'] });
syncDock();

/* ----- الجرس ----- */
async function refreshBell() {
  const t = new Date();
  const today = t.getFullYear() + '-' +
    String(t.getMonth() + 1).padStart(2, '0') + '-' +
    String(t.getDate()).padStart(2, '0');

  const { data, error } = await db
    .from('follow_ups')
    .select('id, next_follow_up, customers(name, phone)')
    .lte('next_follow_up', today)
    .order('next_follow_up', { ascending: true });

  if (error) return;

  bellBadge.textContent = data.length;
  bellBadge.style.display = data.length ? 'grid' : 'none';

  bellMenu.innerHTML = '';
  const title = document.createElement('div');
  title.className = 'bell-title';
  title.textContent = 'متابعات اليوم والمتأخرة';
  bellMenu.appendChild(title);

  if (data.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'bell-empty';
    empty.textContent = 'مفيش متابعات مستحقة 👌';
    bellMenu.appendChild(empty);
    return;
  }

  data.slice(0, 8).forEach(f => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'bell-row';

    const name = document.createElement('strong');
    name.textContent = f.customers ? f.customers.name : 'عميل غير معروف';

    const when = document.createElement('small');
    const late = f.next_follow_up < today;
    when.textContent = f.next_follow_up + (late ? ' • متأخرة' : ' • النهاردة');
    when.className = late ? 'late' : 'today';

    row.appendChild(name);
    row.appendChild(when);
    row.addEventListener('click', () => {
      bellMenu.style.display = 'none';
      goTab('followups');
    });
    bellMenu.appendChild(row);
  });
}

bellBtn.addEventListener('click', async (e) => {
  e.stopPropagation();
  const open = bellMenu.style.display !== 'none';
  if (!open) await refreshBell();
  bellMenu.style.display = open ? 'none' : 'block';
});

document.addEventListener('click', (e) => {
  if (!bellWrap.contains(e.target)) bellMenu.style.display = 'none';
});

// تحديث الجرس مع كل تحميل للبيانات
const _loadAllOriginal = loadAll;
loadAll = function () {
  _loadAllOriginal();
  refreshBell();
};

/* ----- البحث السريع ----- */
function openSearch() {
  if (document.querySelector('.cmd-overlay')) return;

  const overlay = document.createElement('div');
  overlay.className = 'cmd-overlay';

  const box = document.createElement('div');
  box.className = 'cmd-box';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'ابحث عن عميل أو عقار...';

  const results = document.createElement('div');
  results.className = 'cmd-results';

  const hint = document.createElement('div');
  hint.className = 'cmd-hint';
  hint.textContent = 'اكتب حرفين على الأقل • Esc للإغلاق';
  results.appendChild(hint);

  box.appendChild(input);
  box.appendChild(results);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  input.focus();

  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  const addGroup = (label) => {
    const g = document.createElement('div');
    g.className = 'cmd-group';
    g.textContent = label;
    results.appendChild(g);
  };

  const addItem = (icon, main, sub, onPick) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'cmd-item';
    const ic = document.createElement('span');
    ic.textContent = icon;
    const txt = document.createElement('span');
    txt.className = 'cmd-text';
    const m = document.createElement('strong');
    m.textContent = main;
    const s = document.createElement('small');
    s.textContent = sub;
    txt.appendChild(m);
    txt.appendChild(s);
    row.appendChild(ic);
    row.appendChild(txt);
    row.addEventListener('click', () => { close(); onPick(); });
    results.appendChild(row);
  };

  const pick = (tab, inputId, value) => {
    goTab(tab);
    const field = document.getElementById(inputId);
    if (field) {
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const term = input.value.replace(/[,()%*\\]/g, ' ').trim();
      results.innerHTML = '';

      if (term.length < 2) {
        results.appendChild(hint);
        return;
      }

      const [cRes, pRes] = await Promise.all([
        db.from('customers').select('id, name, phone')
          .or('name.ilike.%' + term + '%,phone.ilike.%' + term + '%').limit(6),
        db.from('properties').select('id, type, area, governorate, price')
          .or('type.ilike.%' + term + '%,area.ilike.%' + term + '%,governorate.ilike.%' + term + '%').limit(6)
      ]);

      const customers = cRes.data || [];
      const properties = pRes.data || [];

      if (!customers.length && !properties.length) {
        const none = document.createElement('div');
        none.className = 'cmd-hint';
        none.textContent = 'مفيش نتايج مطابقة';
        results.appendChild(none);
        return;
      }

      if (customers.length) {
        addGroup('العملاء');
        customers.forEach(c => addItem('👤', c.name, c.phone || 'بدون تليفون',
          () => pick('customers', 'customer-search', c.name)));
      }

      if (properties.length) {
        addGroup('العقارات');
        properties.forEach(p => addItem('🏢', p.type + ' ' + (p.area || ''),
          (p.governorate || '') + (p.price ? ' • ' + Number(p.price).toLocaleString('en-US') + ' جنيه' : ''),
          () => pick('properties', 'property-search', p.area || p.type)));
      }
    }, 250);
  });
}

searchBtn.addEventListener('click', openSearch);

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && appRoot.style.display !== 'none') {
    e.preventDefault();
    openSearch();
  }
});

