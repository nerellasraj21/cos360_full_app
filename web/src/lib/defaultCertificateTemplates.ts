// src/lib/defaultCertificateTemplates.ts
// Pre-built certificate HTML templates sourced from school's official .docx files

export const BONAFIDE_CLASS1TO10_HTML = `
<div style="max-width:780px;margin:0 auto;padding:40px 48px;font-family:Arial,sans-serif;border:3px double #222;color:#222;background:#fff;">

  <!-- Header -->
  <div style="text-align:center;border-bottom:2px solid #222;padding-bottom:14px;margin-bottom:18px;">
    <img src="{{school_logo}}" alt="School Logo" style="width:80px;height:80px;object-fit:contain;display:block;margin:0 auto 6px;" onerror="this.style.display='none'" />
    <h1 style="font-size:22px;font-weight:bold;margin:0 0 4px 0;letter-spacing:1px;">{{school_name}}</h1>
    <p style="font-size:13px;margin:2px 0;">[ School Sub-Title / Motto ]</p>
    <p style="font-size:11px;margin:2px 0;">[ Full Address, City - PIN Code ]</p>
    <p style="font-size:11px;margin:2px 0;">Ph: [ Phone ] &nbsp;|&nbsp; Email: [ Email ] &nbsp;|&nbsp; Web: [ Website ]</p>
    <p style="font-size:10px;margin:4px 0;">Reg. No.: [ &nbsp; ] &nbsp;|&nbsp; Board: [ CBSE / ICSE / State Board ] &nbsp;|&nbsp; Affil. No.: [ &nbsp; ]</p>
  </div>

  <!-- Title -->
  <div style="text-align:center;margin-bottom:18px;">
    <h2 style="font-size:17px;font-weight:bold;text-decoration:underline;letter-spacing:3px;margin:0 0 4px 0;color:#1a3c8b;">BONAFIDE CERTIFICATE</h2>
    <p style="font-size:12px;color:#555;margin:0;">(For Current Students &mdash; Class I to X)</p>
  </div>

  <!-- Cert No & Date row -->
  <table style="width:100%;font-size:12px;margin-bottom:16px;"><tr>
    <td><strong>Cert. No.:</strong> &nbsp;_______________</td>
    <td style="text-align:right;"><strong>Date of Issue:</strong> &nbsp;{{issue_date}}</td>
  </tr></table>

  <!-- Body -->
  <div style="font-size:13px;line-height:2;text-align:justify;">
    <p style="margin:0 0 6px 0;">
      This is to certify that <strong>{{student_name}}</strong>, bearing Admission Number <strong>{{admission_number}}</strong>, is a bonafide student of this institution.
    </p>
    <p style="margin:0 0 6px 0;">
      The student&rsquo;s Date of Birth is <strong>{{dob}}</strong> as per school records.&nbsp;
      Gender: <strong>{{gender}}</strong>.&nbsp;
      Aadhaar Number: <strong>{{aadhar_number}}</strong>.&nbsp;
      AAPHAR Number: <strong>{{apaar_number}}</strong>.
    </p>
    <p style="margin:0 0 6px 0;">
      The student is presently studying in Class <strong>{{class_name}}</strong>, Section <strong>{{section}}</strong>, during the academic year <strong>{{academic_year}}</strong>.
    </p>
    <p style="margin:0 0 6px 0;">
      The student was admitted to this school on <strong>{{date_of_joining}}</strong> and was a student of this institution up to <strong>{{date_of_leaving}}</strong>.
      The student joined the current class on <strong>{{date_of_joining_class}}</strong> and left the current class on <strong>{{date_of_leaving_class}}</strong>.
    </p>
    <p style="margin:0 0 6px 0;">
      Father&rsquo;s Name: <strong>{{father_name}}</strong>.&nbsp;
      Mother&rsquo;s Name: <strong>{{mother_name}}</strong>.&nbsp;
      Guardian&rsquo;s Name (if applicable): <strong>{{guardian_details}}</strong>.
    </p>
    <p style="margin:0 0 6px 0;">
      The conduct and character of the student during the period of study at this institution has been <strong>_______________</strong> and attendance has been <strong>_______________</strong>.
    </p>
    <p style="margin:0 0 6px 0;">
      This certificate is issued on request for the purpose of <strong>_______________</strong>.
    </p>
  </div>

  <!-- Signatures -->
  <table style="width:100%;margin-top:50px;font-size:12px;text-align:center;"><tr>
    <td style="width:33%;padding-top:0;">
      <div style="border-top:1px solid #222;padding-top:6px;">________________________<br/><strong>Class Teacher</strong></div>
    </td>
    <td style="width:33%;padding-top:0;">
      <div style="border-top:1px solid #222;padding-top:6px;">________________________<br/><strong>Accountant / Office</strong></div>
    </td>
    <td style="width:33%;padding-top:0;">
      <div style="border-top:1px solid #222;padding-top:6px;">________________________<br/><strong>Principal / Head &amp; School Seal</strong></div>
    </td>
  </tr></table>

  <!-- Footer -->
  <div style="text-align:center;margin-top:20px;border-top:1px solid #999;padding-top:8px;font-size:10px;color:#666;">
    <em>This certificate is valid only with the official seal and signature of the Principal.</em>
  </div>
</div>
`;

export const BONAFIDE_PERMANENT_AFTER10TH_HTML = `
<div style="max-width:780px;margin:0 auto;padding:40px 48px;font-family:Arial,sans-serif;border:3px double #222;color:#222;background:#fff;">

  <!-- Header -->
  <div style="text-align:center;border-bottom:2px solid #222;padding-bottom:14px;margin-bottom:18px;">
    <img src="{{school_logo}}" alt="School Logo" style="width:80px;height:80px;object-fit:contain;display:block;margin:0 auto 6px;" onerror="this.style.display='none'" />
    <h1 style="font-size:22px;font-weight:bold;margin:0 0 4px 0;letter-spacing:1px;">{{school_name}}</h1>
    <p style="font-size:13px;margin:2px 0;">[ School Sub-Title / Motto ]</p>
    <p style="font-size:11px;margin:2px 0;">[ Full Address, City - PIN Code ]</p>
    <p style="font-size:11px;margin:2px 0;">Ph: [ Phone ] &nbsp;|&nbsp; Email: [ Email ] &nbsp;|&nbsp; Web: [ Website ]</p>
    <p style="font-size:10px;margin:4px 0;">Reg. No.: [ &nbsp; ] &nbsp;|&nbsp; Board: [ CBSE / ICSE / State Board ] &nbsp;|&nbsp; Affil. No.: [ &nbsp; ]</p>
  </div>

  <!-- Title -->
  <div style="text-align:center;margin-bottom:18px;">
    <h2 style="font-size:17px;font-weight:bold;text-decoration:underline;letter-spacing:2px;margin:0 0 4px 0;color:#1a5c1a;">PERMANENT BONAFIDE CERTIFICATE</h2>
    <p style="font-size:12px;color:#555;margin:0;">(Issued upon completion of Secondary Education &mdash; Class X)</p>
  </div>

  <!-- Cert No & Date row -->
  <table style="width:100%;font-size:12px;margin-bottom:16px;"><tr>
    <td><strong>Cert. No.:</strong> &nbsp;_______________</td>
    <td style="text-align:right;"><strong>Date of Issue:</strong> &nbsp;{{issue_date}}</td>
  </tr></table>

  <!-- Body -->
  <div style="font-size:13px;line-height:2;text-align:justify;">
    <p style="margin:0 0 6px 0;">
      This is to certify that <strong>{{student_name}}</strong>, bearing Admission Number <strong>{{admission_number}}</strong>, was a bonafide student of this institution.
    </p>
    <p style="margin:0 0 6px 0;">
      The student&rsquo;s Date of Birth is <strong>{{dob}}</strong> as per school records.&nbsp;
      Gender: <strong>{{gender}}</strong>.&nbsp;
      Aadhaar Number: <strong>{{aadhar_number}}</strong>.&nbsp;
      AAPHAR Number: <strong>{{apaar_number}}</strong>.
    </p>
    <p style="margin:0 0 6px 0;">
      The student was admitted to this school on <strong>{{date_of_joining}}</strong> and was a student of this institution up to <strong>{{date_of_leaving}}</strong>.
      The student joined Class X on <strong>{{date_of_joining_class}}</strong> and left Class X on <strong>{{date_of_leaving_class}}</strong>.
    </p>
    <p style="margin:0 0 6px 0;">
      The student appeared in the _______________ Secondary School Examination (Class X) in the academic year <strong>{{academic_year}}</strong> and the result was declared as _______________.
    </p>
    <p style="margin:0 0 6px 0;">
      Father&rsquo;s Name: <strong>{{father_name}}</strong>.&nbsp;
      Mother&rsquo;s Name: <strong>{{mother_name}}</strong>.&nbsp;
      Guardian&rsquo;s Name (if applicable): <strong>{{guardian_details}}</strong>.
    </p>
    <p style="margin:0 0 6px 0;">
      The conduct and character of the student throughout the period of study at this institution was <strong>_______________</strong>.
    </p>
    <p style="margin:0 0 6px 0;">
      This permanent certificate is issued on request for the purpose of <strong>_______________</strong>.
    </p>
  </div>

  <!-- Signatures -->
  <table style="width:100%;margin-top:50px;font-size:12px;text-align:center;"><tr>
    <td style="width:33%;padding-top:0;">
      <div style="border-top:1px solid #222;padding-top:6px;">________________________<br/><strong>Class Teacher</strong></div>
    </td>
    <td style="width:33%;padding-top:0;">
      <div style="border-top:1px solid #222;padding-top:6px;">________________________<br/><strong>Accountant / Office</strong></div>
    </td>
    <td style="width:33%;padding-top:0;">
      <div style="border-top:1px solid #222;padding-top:6px;">________________________<br/><strong>Principal / Head &amp; School Seal</strong></div>
    </td>
  </tr></table>

  <!-- Footer -->
  <div style="text-align:center;margin-top:20px;border-top:1px solid #999;padding-top:8px;font-size:10px;color:#666;">
    <em>This is a Permanent Record. Any tampering or forgery is a punishable offence under applicable law.</em>
  </div>
</div>
`;

export const CONDUCT_CLASS1TO10_HTML = `
<div style="max-width:780px;margin:0 auto;padding:40px 48px;font-family:Arial,sans-serif;border:3px double #222;color:#222;background:#fff;">

  <!-- Header -->
  <div style="text-align:center;border-bottom:2px solid #222;padding-bottom:14px;margin-bottom:18px;">
    <img src="{{school_logo}}" alt="School Logo" style="width:80px;height:80px;object-fit:contain;display:block;margin:0 auto 6px;" onerror="this.style.display='none'" />
    <h1 style="font-size:22px;font-weight:bold;margin:0 0 4px 0;letter-spacing:1px;">{{school_name}}</h1>
    <p style="font-size:13px;margin:2px 0;">[ School Sub-Title / Motto ]</p>
    <p style="font-size:11px;margin:2px 0;">[ Full Address, City &ndash; PIN Code ]</p>
    <p style="font-size:11px;margin:2px 0;">Ph: [ Phone ] &nbsp;|&nbsp; Email: [ Email ] &nbsp;|&nbsp; Web: [ Website ]</p>
    <p style="font-size:10px;margin:4px 0;">Reg. No.: [ &nbsp; ] &nbsp;|&nbsp; Board: [ CBSE / ICSE / State Board ] &nbsp;|&nbsp; Affil. No.: [ &nbsp; ]</p>
  </div>

  <!-- Title -->
  <div style="text-align:center;margin-bottom:18px;">
    <h2 style="font-size:17px;font-weight:bold;letter-spacing:3px;margin:0 0 4px 0;color:#1a5c1a;">CONDUCT CERTIFICATE</h2>
    <p style="font-size:12px;color:#555;font-style:italic;margin:0;">(For Students &ndash; Class I to X)</p>
  </div>

  <!-- Cert No & Date row -->
  <table style="width:100%;font-size:12px;margin-bottom:16px;"><tr>
    <td><strong>Cert. No.:</strong> &nbsp;_______________</td>
    <td style="text-align:right;"><strong>Date of Issue:</strong> &nbsp;{{issue_date}}</td>
  </tr></table>

  <!-- Body -->
  <div style="font-size:13px;line-height:2;text-align:justify;">
    <p style="margin:0 0 6px 0;">
      This is to certify that <strong>Mr. / Ms. / Ku. {{student_name}}</strong>, son / daughter / ward of <strong>{{father_name}}</strong>,
      bearing Admission No. <strong>{{admission_number}}</strong>, is / was a student of this institution.
    </p>
    <p style="margin:0 0 6px 0;">
      Date of Birth: <strong>{{dob}}</strong>. Gender: <strong>{{gender}}</strong>.
      Aadhaar Number: <strong>{{aadhar_number}}</strong>. AAPHAR Number: <strong>{{apaar_number}}</strong>.
    </p>
    <p style="margin:0 0 6px 0;">
      The student is presently studying in Class <strong>{{class_name}}</strong>, Section <strong>{{section}}</strong>,
      during the academic year <strong>{{academic_year}}</strong>. The student was admitted to this school on
      <strong>{{date_of_joining}}</strong> and joined the current / last class on <strong>{{date_of_joining_class}}</strong>.
    </p>
    <p style="margin:0 0 6px 0;">
      Father&rsquo;s Name: <strong>{{father_name}}</strong>.&nbsp;
      Mother&rsquo;s Name: <strong>{{mother_name}}</strong>.&nbsp;
      Guardian&rsquo;s Name (if applicable): <strong>{{guardian_details}}</strong>.
    </p>
    <p style="margin:0 0 6px 0;">
      During the student&rsquo;s association with this institution, the conduct and character of the student has been observed
      to be <strong>[ Good / Excellent / Very Good / Satisfactory ]</strong>. The student has been <strong>[ Regular / Punctual / Disciplined ]</strong> in attending school
      and has maintained a positive attitude towards studies and co-curricular activities.
    </p>
    <p style="margin:0 0 6px 0;">
      This certificate is issued on request for the purpose of <strong>[ Purpose &ndash; Scholarship / Bank Account / Government / Other ]</strong> and shall be considered
      valid only with the official seal and signature of the Principal.
    </p>
  </div>

  <!-- Signatures -->
  <table style="width:100%;margin-top:50px;font-size:12px;text-align:center;"><tr>
    <td style="width:33%;padding-top:0;">
      <div style="border-top:1px solid #222;padding-top:6px;">________________________<br/><strong>Class Teacher</strong><br/>[ Name ]</div>
    </td>
    <td style="width:33%;padding-top:0;">
      <div style="border-top:1px solid #222;padding-top:6px;">________________________<br/><strong>Accountant / Office</strong><br/>[ Name ]</div>
    </td>
    <td style="width:33%;padding-top:0;">
      <div style="border-top:1px solid #222;padding-top:6px;">________________________<br/><strong>Principal / Head &amp; Seal</strong><br/>[ Name ]</div>
    </td>
  </tr></table>
</div>
`;

export const CONDUCT_AFTER10TH_HTML = `
<div style="max-width:780px;margin:0 auto;padding:40px 48px;font-family:Arial,sans-serif;border:3px double #222;color:#222;background:#fff;">

  <!-- Header -->
  <div style="text-align:center;border-bottom:2px solid #222;padding-bottom:14px;margin-bottom:18px;">
    <img src="{{school_logo}}" alt="School Logo" style="width:80px;height:80px;object-fit:contain;display:block;margin:0 auto 6px;" onerror="this.style.display='none'" />
    <h1 style="font-size:22px;font-weight:bold;margin:0 0 4px 0;letter-spacing:1px;">{{school_name}}</h1>
    <p style="font-size:13px;margin:2px 0;">[ School Sub-Title / Motto ]</p>
    <p style="font-size:11px;margin:2px 0;">[ Full Address, City &ndash; PIN Code ]</p>
    <p style="font-size:11px;margin:2px 0;">Ph: [ Phone ] &nbsp;|&nbsp; Email: [ Email ] &nbsp;|&nbsp; Web: [ Website ]</p>
    <p style="font-size:10px;margin:4px 0;">Reg. No.: [ &nbsp; ] &nbsp;|&nbsp; Board: [ CBSE / ICSE / State Board ] &nbsp;|&nbsp; Affil. No.: [ &nbsp; ]</p>
  </div>

  <!-- Title -->
  <div style="text-align:center;margin-bottom:18px;">
    <h2 style="font-size:17px;font-weight:bold;letter-spacing:3px;margin:0 0 4px 0;color:#1a5c1a;">CONDUCT CERTIFICATE</h2>
    <p style="font-size:12px;color:#555;font-style:italic;margin:0;">(Permanent Record &ndash; Issued upon completion of Class X)</p>
  </div>

  <!-- Cert No & Date row -->
  <table style="width:100%;font-size:12px;margin-bottom:16px;"><tr>
    <td><strong>Cert. No.:</strong> &nbsp;_______________</td>
    <td style="text-align:right;"><strong>Date of Issue:</strong> &nbsp;{{issue_date}}</td>
  </tr></table>

  <!-- Body -->
  <div style="font-size:13px;line-height:2;text-align:justify;">
    <p style="margin:0 0 6px 0;">
      This is to certify that <strong>Mr. / Ms. / Ku. {{student_name}}</strong>, son / daughter / ward of <strong>{{father_name}}</strong>,
      bearing Admission Number <strong>{{admission_number}}</strong>, was a bonafide student of this institution.
    </p>
    <p style="margin:0 0 6px 0;">
      Date of Birth: <strong>{{dob}}</strong>. Gender: <strong>{{gender}}</strong>.
      Aadhaar Number: <strong>{{aadhar_number}}</strong>. AAPHAR Number: <strong>{{apaar_number}}</strong>.
    </p>
    <p style="margin:0 0 6px 0;">
      The student was admitted to this institution on <strong>{{date_of_joining}}</strong> and remained a student here until
      <strong>{{date_of_leaving}}</strong>. The student joined Class X on <strong>{{date_of_joining_class}}</strong>
      and left Class X on <strong>{{date_of_leaving_class}}</strong>.
    </p>
    <p style="margin:0 0 6px 0;">
      The student appeared in the <strong>[ Board Name ]</strong> Secondary School Examination (Class X) in the academic year
      <strong>{{academic_year}}</strong> and the result was declared as <strong>[ Pass / Compartment / Result Awaited ]</strong>.
    </p>
    <p style="margin:0 0 6px 0;">
      Father&rsquo;s Name: <strong>{{father_name}}</strong>.&nbsp;
      Mother&rsquo;s Name: <strong>{{mother_name}}</strong>.&nbsp;
      Guardian&rsquo;s Name (if applicable): <strong>{{guardian_details}}</strong>.
    </p>
    <p style="margin:0 0 6px 0;">
      During the entire period of the student&rsquo;s association with this institution, the conduct and character of the student
      was observed to be <strong>[ Good / Excellent / Very Good / Satisfactory ]</strong>. The student has been <strong>[ Regular / Punctual / Disciplined ]</strong> and has maintained
      a positive attitude towards studies, discipline, and co-curricular activities throughout the tenure at this school.
    </p>
    <p style="margin:0 0 6px 0;">
      This certificate is issued on request for the purpose of <strong>[ Purpose &ndash; Higher Education / Employment / Government / Other ]</strong>.
      This is a permanent record and any tampering or forgery is a punishable offence under applicable law.
    </p>
  </div>

  <!-- Signatures -->
  <table style="width:100%;margin-top:50px;font-size:12px;text-align:center;"><tr>
    <td style="width:33%;padding-top:0;">
      <div style="border-top:1px solid #222;padding-top:6px;">________________________<br/><strong>Class Teacher / Incharge</strong><br/>[ Name ]</div>
    </td>
    <td style="width:33%;padding-top:0;">
      <div style="border-top:1px solid #222;padding-top:6px;">________________________<br/><strong>Accountant / Office</strong><br/>[ Name ]</div>
    </td>
    <td style="width:33%;padding-top:0;">
      <div style="border-top:1px solid #222;padding-top:6px;">________________________<br/><strong>Principal / Head &amp; Seal</strong><br/>[ Name ]</div>
    </td>
  </tr></table>
</div>
`;

export const TC_BEFORE10TH_HTML = `
<div style="max-width:780px;margin:0 auto;padding:40px 48px;font-family:Arial,sans-serif;border:3px double #222;color:#222;background:#fff;">

  <!-- Header -->
  <div style="text-align:center;border-bottom:2px solid #222;padding-bottom:14px;margin-bottom:18px;">
    <img src="{{school_logo}}" alt="School Logo" style="width:80px;height:80px;object-fit:contain;display:block;margin:0 auto 6px;" onerror="this.style.display='none'" />
    <h1 style="font-size:22px;font-weight:bold;margin:0 0 4px 0;letter-spacing:1px;">{{school_name}}</h1>
    <p style="font-size:13px;margin:2px 0;">[ School Sub-Title / Motto ]</p>
    <p style="font-size:11px;margin:2px 0;">[ Full Address, City &ndash; PIN Code ]</p>
    <p style="font-size:11px;margin:2px 0;">Ph: [ Phone ] &nbsp;|&nbsp; Email: [ Email ] &nbsp;|&nbsp; Web: [ Website ]</p>
    <p style="font-size:10px;margin:4px 0;">Reg. No.: [ &nbsp; ] &nbsp;|&nbsp; Board: [ CBSE / ICSE / State Board ] &nbsp;|&nbsp; Affil. No.: [ &nbsp; ]</p>
  </div>

  <!-- Title -->
  <div style="text-align:center;margin-bottom:18px;">
    <h2 style="font-size:17px;font-weight:bold;letter-spacing:3px;margin:0 0 4px 0;color:#7B3300;">TRANSFER CERTIFICATE</h2>
    <p style="font-size:12px;color:#555;font-style:italic;margin:0;">(Issued before completion of Class X)</p>
  </div>

  <!-- Cert No & Date row -->
  <table style="width:100%;font-size:12px;margin-bottom:16px;"><tr>
    <td><strong>Cert. No.:</strong> &nbsp;_______________</td>
    <td style="text-align:right;"><strong>Date of Issue:</strong> &nbsp;{{issue_date}}</td>
  </tr></table>

  <!-- Body -->
  <div style="font-size:13px;line-height:2;text-align:justify;">
    <p style="margin:0 0 6px 0;">
      This is to certify that <strong>Mr. / Ms. / Ku. {{student_name}}</strong>, son / daughter / ward of <strong>{{father_name}}</strong>,
      bearing Admission Number <strong>{{admission_number}}</strong>, was a bonafide student of this institution.
    </p>
    <p style="margin:0 0 6px 0;">
      Date of Birth: <strong>{{dob}}</strong>. Gender: <strong>{{gender}}</strong>.
      Aadhaar Number: <strong>{{aadhar_number}}</strong>. AAPHAR Number: <strong>{{apaar_number}}</strong>.
    </p>
    <p style="margin:0 0 6px 0;">
      The student was admitted to this institution on <strong>{{date_of_joining}}</strong>. The student studied up to
      Class <strong>{{class_name}}</strong>, Section <strong>{{section}}</strong>, during the academic year
      <strong>{{academic_year}}</strong>. The student joined this class on <strong>{{date_of_joining_class}}</strong>
      and is leaving / has left on <strong>{{date_of_leaving_class}}</strong>.
    </p>
    <p style="margin:0 0 6px 0;">
      Father&rsquo;s Name: <strong>{{father_name}}</strong>.&nbsp;
      Mother&rsquo;s Name: <strong>{{mother_name}}</strong>.&nbsp;
      Guardian&rsquo;s Name (if applicable): <strong>{{guardian_details}}</strong>.
    </p>
    <p style="margin:0 0 6px 0;">
      The student&rsquo;s progress in studies has been <strong>[ Good / Satisfactory / Average ]</strong> and conduct and character throughout
      the period of study has been <strong>[ Good / Excellent / Satisfactory ]</strong>. Attendance has been <strong>[ Regular / Satisfactory ]</strong>.
    </p>
    <p style="margin:0 0 6px 0;">
      The student&rsquo;s name has been removed from the rolls of this school with effect from <strong>[ Date of Removal from Rolls ]</strong>.
      No dues are pending against the student as on date of issue of this certificate.
    </p>
    <p style="margin:0 0 6px 0;">
      This Transfer Certificate is issued on request of <strong>[ Parent / Guardian / Student ]</strong> for the purpose of
      <strong>[ Admission to another school / Institution ]</strong> and is issued without any objection from this institution.
    </p>
  </div>

  <!-- Signatures -->
  <table style="width:100%;margin-top:50px;font-size:12px;text-align:center;"><tr>
    <td style="width:33%;padding-top:0;">
      <div style="border-top:1px solid #222;padding-top:6px;">________________________<br/><strong>Class Teacher</strong><br/>[ Name ]</div>
    </td>
    <td style="width:33%;padding-top:0;">
      <div style="border-top:1px solid #222;padding-top:6px;">________________________<br/><strong>Accountant / Office</strong><br/>[ Name ]</div>
    </td>
    <td style="width:33%;padding-top:0;">
      <div style="border-top:1px solid #222;padding-top:6px;">________________________<br/><strong>Principal / Head &amp; Seal</strong><br/>[ Name ]</div>
    </td>
  </tr></table>
</div>
`;

export const TC_AFTER10TH_HTML = `
<div style="max-width:780px;margin:0 auto;padding:40px 48px;font-family:Arial,sans-serif;border:3px double #222;color:#222;background:#fff;">

  <!-- Header -->
  <div style="text-align:center;border-bottom:2px solid #222;padding-bottom:14px;margin-bottom:18px;">
    <img src="{{school_logo}}" alt="School Logo" style="width:80px;height:80px;object-fit:contain;display:block;margin:0 auto 6px;" onerror="this.style.display='none'" />
    <h1 style="font-size:22px;font-weight:bold;margin:0 0 4px 0;letter-spacing:1px;">{{school_name}}</h1>
    <p style="font-size:13px;margin:2px 0;">[ School Sub-Title / Motto ]</p>
    <p style="font-size:11px;margin:2px 0;">[ Full Address, City &ndash; PIN Code ]</p>
    <p style="font-size:11px;margin:2px 0;">Ph: [ Phone ] &nbsp;|&nbsp; Email: [ Email ] &nbsp;|&nbsp; Web: [ Website ]</p>
    <p style="font-size:10px;margin:4px 0;">Reg. No.: [ &nbsp; ] &nbsp;|&nbsp; Board: [ CBSE / ICSE / State Board ] &nbsp;|&nbsp; Affil. No.: [ &nbsp; ]</p>
  </div>

  <!-- Title -->
  <div style="text-align:center;margin-bottom:18px;">
    <h2 style="font-size:17px;font-weight:bold;letter-spacing:3px;margin:0 0 4px 0;color:#8B0000;">TRANSFER CERTIFICATE</h2>
    <p style="font-size:12px;color:#555;font-style:italic;margin:0;">(Permanent Record &ndash; Issued upon completion of Class X / Passing Out)</p>
  </div>

  <!-- Cert No & Date row -->
  <table style="width:100%;font-size:12px;margin-bottom:16px;"><tr>
    <td><strong>Cert. No.:</strong> &nbsp;_______________</td>
    <td style="text-align:right;"><strong>Date of Issue:</strong> &nbsp;{{issue_date}}</td>
  </tr></table>

  <!-- Body -->
  <div style="font-size:13px;line-height:2;text-align:justify;">
    <p style="margin:0 0 6px 0;">
      This is to certify that <strong>Mr. / Ms. / Ku. {{student_name}}</strong>, son / daughter / ward of <strong>{{father_name}}</strong>,
      bearing Admission Number <strong>{{admission_number}}</strong>, was a bonafide student of this institution.
    </p>
    <p style="margin:0 0 6px 0;">
      Date of Birth: <strong>{{dob}}</strong>. Gender: <strong>{{gender}}</strong>.
      Aadhaar Number: <strong>{{aadhar_number}}</strong>. AAPHAR Number: <strong>{{apaar_number}}</strong>.
    </p>
    <p style="margin:0 0 6px 0;">
      The student was admitted to this institution on <strong>{{date_of_joining}}</strong> and remained a student of this school
      until <strong>{{date_of_leaving}}</strong>. The student joined Class X on <strong>{{date_of_joining_class}}</strong>
      and left Class X on <strong>{{date_of_leaving_class}}</strong>.
    </p>
    <p style="margin:0 0 6px 0;">
      The student appeared in the <strong>[ Board Name ]</strong> Secondary School Examination (Class X) in the academic year
      <strong>{{academic_year}}</strong> and the result was declared as <strong>[ Pass / Compartment / Result Awaited ]</strong>.
      Roll Number (Board): <strong>[ Board Roll No. ]</strong>.
    </p>
    <p style="margin:0 0 6px 0;">
      Father&rsquo;s Name: <strong>{{father_name}}</strong>.&nbsp;
      Mother&rsquo;s Name: <strong>{{mother_name}}</strong>.&nbsp;
      Guardian&rsquo;s Name (if applicable): <strong>{{guardian_details}}</strong>.
    </p>
    <p style="margin:0 0 6px 0;">
      The student&rsquo;s progress in studies has been <strong>[ Good / Satisfactory / Average ]</strong> and conduct and character throughout
      the entire period of study at this institution has been <strong>[ Good / Excellent / Satisfactory ]</strong>. Attendance has been <strong>[ Regular / Satisfactory ]</strong>.
    </p>
    <p style="margin:0 0 6px 0;">
      The student&rsquo;s name has been removed from the rolls of this school with effect from <strong>[ Date of Removal from Rolls ]</strong>.
      No dues are pending against the student as on date of issue of this Transfer Certificate.
    </p>
    <p style="margin:0 0 6px 0;">
      This Transfer Certificate is issued on request of <strong>[ Parent / Guardian / Student ]</strong> for the purpose of <strong>[ Higher Education / Employment / Govt. use / Other ]</strong>.
      This is a permanent record and any tampering or forgery is a punishable offence under applicable law.
    </p>
  </div>

  <!-- Signatures -->
  <table style="width:100%;margin-top:50px;font-size:12px;text-align:center;"><tr>
    <td style="width:33%;padding-top:0;">
      <div style="border-top:1px solid #222;padding-top:6px;">________________________<br/><strong>Class Teacher / Incharge</strong><br/>[ Name ]</div>
    </td>
    <td style="width:33%;padding-top:0;">
      <div style="border-top:1px solid #222;padding-top:6px;">________________________<br/><strong>Accountant / Office</strong><br/>[ Name ]</div>
    </td>
    <td style="width:33%;padding-top:0;">
      <div style="border-top:1px solid #222;padding-top:6px;">________________________<br/><strong>Principal / Head &amp; Seal</strong><br/>[ Name ]</div>
    </td>
  </tr></table>

  <!-- Footer -->
  <div style="text-align:center;margin-top:20px;border-top:1px solid #999;padding-top:8px;font-size:10px;color:#666;">
    <em>This is a Permanent Record. Transfer Certificate once issued will NOT be re-issued. Please preserve it carefully.</em>
  </div>
</div>
`;

export const DEFAULT_TEMPLATES = [
  {
    name: "Bonafide Certificate (Class I–X)",
    html_template: BONAFIDE_CLASS1TO10_HTML,
    color_theme: "blue" as const,
  },
  {
    name: "Permanent Bonafide Certificate (After Class X)",
    html_template: BONAFIDE_PERMANENT_AFTER10TH_HTML,
    color_theme: "green" as const,
  },
  {
    name: "Conduct Certificate (Class I–X)",
    html_template: CONDUCT_CLASS1TO10_HTML,
    color_theme: "green" as const,
  },
  {
    name: "Conduct Certificate – Permanent (After Class X)",
    html_template: CONDUCT_AFTER10TH_HTML,
    color_theme: "green" as const,
  },
  {
    name: "Transfer Certificate (Before Class X)",
    html_template: TC_BEFORE10TH_HTML,
    color_theme: "orange" as const,
  },
  {
    name: "Transfer Certificate – Permanent (After Class X)",
    html_template: TC_AFTER10TH_HTML,
    color_theme: "red" as const,
  },
];
