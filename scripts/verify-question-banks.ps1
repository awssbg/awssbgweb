[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

function Assert-Condition {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw $Message }
}

function Read-Bank {
  param(
    [string]$Path,
    [string]$Certification,
    [string]$ExamCode,
    [int]$ExpectedCount,
    [hashtable]$ExpectedDomains,
    [string]$ExpectedPrefix
  )

  $records = @(Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json)
  Assert-Condition ($records.Count -eq $ExpectedCount) "$Path must contain exactly $ExpectedCount records; found $($records.Count)."

  $expectedIds = 1..$ExpectedCount | ForEach-Object { '{0}-{1:D3}' -f $ExpectedPrefix, $_ }
  $actualIds = @($records | ForEach-Object { $_.external_id })
  Assert-Condition (($actualIds -join '|') -eq ($expectedIds -join '|')) "$Path has missing, duplicate, or out-of-order external IDs."

  $domains = @{}
  $normalizedText = @{}
  foreach ($question in $records) {
    foreach ($field in @('certification','exam_code','external_id','domain','difficulty','question_type','question_text','explanation','publication_status')) {
      Assert-Condition (-not [string]::IsNullOrWhiteSpace([string]$question.$field)) "$($question.external_id) is missing $field."
    }
    Assert-Condition ($question.certification -eq $Certification) "$($question.external_id) has the wrong certification slug."
    Assert-Condition ($question.exam_code -eq $ExamCode) "$($question.external_id) has the wrong exam code."
    Assert-Condition ($question.question_type -in @('single_answer','multiple_response')) "$($question.external_id) has an invalid question type."
    Assert-Condition ($question.difficulty -in @('easy','medium','hard')) "$($question.external_id) has an invalid difficulty."
    Assert-Condition ($question.publication_status -in @('draft','review','published','retired')) "$($question.external_id) has an invalid publication status."
    Assert-Condition (@($question.options).Count -ge 4) "$($question.external_id) has fewer than four options."
    $keys = @($question.options | ForEach-Object { $_.key })
    Assert-Condition (($keys | Select-Object -Unique).Count -eq $keys.Count) "$($question.external_id) has duplicate option keys."
    Assert-Condition (@($question.correct_option_keys).Count -ge 1) "$($question.external_id) has no correct option mapping."
    Assert-Condition ((@($question.correct_option_keys | Where-Object { $_ -notin $keys }).Count) -eq 0) "$($question.external_id) maps an answer to a missing option."
    if ($question.question_type -eq 'single_answer') { Assert-Condition (@($question.correct_option_keys).Count -eq 1) "$($question.external_id) must have exactly one correct option." }
    if ($question.question_type -eq 'multiple_response') { Assert-Condition (@($question.correct_option_keys).Count -ge 2) "$($question.external_id) must have at least two correct options." }
    if ($domains.ContainsKey($question.domain)) {
    $domains[$question.domain] = [int]$domains[$question.domain] + 1
} else {
    $domains[$question.domain] = 1
}
    $key = ($question.question_text.ToLowerInvariant() -replace '[^a-z0-9]+', ' ').Trim() -replace '\s+', ' '
    Assert-Condition (-not $normalizedText.ContainsKey($key)) "$($question.external_id) has normalized duplicate question text with $($normalizedText[$key])."
    $normalizedText[$key] = $question.external_id
  }
  foreach ($domain in $ExpectedDomains.Keys) { Assert-Condition ($domains[$domain] -eq $ExpectedDomains[$domain]) "$Path has $($domains[$domain]) '$domain' records; expected $($ExpectedDomains[$domain])." }
  Assert-Condition ($domains.Count -eq $ExpectedDomains.Count) "$Path has an unexpected domain label."
  return [pscustomobject]@{ certification = $Certification; exam_code = $ExamCode; question_count = $records.Count; domain_counts = $domains; publication_status = @($records | Group-Object publication_status | ForEach-Object { @{ ($_.Name) = $_.Count } }) }
}

$clf = Read-Bank -Path 'content/clf-c02-question-bank.json' -Certification 'cloud-practitioner' -ExamCode 'CLF-C02' -ExpectedCount 45 -ExpectedPrefix 'CLF' -ExpectedDomains @{
  'Cloud concepts' = 14; 'Security and compliance' = 14; 'Cloud technology and services' = 15; 'Billing and pricing' = 2
}
$aif = Read-Bank -Path 'content/aif-c01-question-bank.json' -Certification 'ai-practitioner' -ExamCode 'AIF-C01' -ExpectedCount 45 -ExpectedPrefix 'AIF' -ExpectedDomains @{
  'AI and ML fundamentals' = 9; 'Generative AI fundamentals' = 11; 'Foundation model applications' = 13; 'Responsible AI' = 6; 'Security, compliance, and governance' = 6
}
$saa = @(Get-Content -Raw -LiteralPath 'supabase/existing-questions.seed.json' | ConvertFrom-Json)
Assert-Condition ($saa.Count -eq 60) "The SAA seed must contain 60 records; found $($saa.Count)."
Assert-Condition ((@($saa | ForEach-Object external_id) -join '|') -eq ((1..60 | ForEach-Object { 'SAA-{0:D3}' -f $_ }) -join '|')) 'The SAA seed IDs are not SAA-001 through SAA-060.'

Write-Output (@{ result = 'passed'; banks = @($clf, $aif); saa_question_count = $saa.Count; note = 'This validates local content only. It neither contacts Supabase nor exposes answer keys.' } | ConvertTo-Json -Depth 6)
