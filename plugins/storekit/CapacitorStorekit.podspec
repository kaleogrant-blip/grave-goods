require 'json'
package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
Pod::Spec.new do |s|
  s.name = 'CapacitorStorekit'
  s.version = package['version']
  s.summary = package['description']
  s.license = 'MIT'
  s.homepage = 'https://example.invalid/grave-goods'
  s.author = 'Grave Goods'
  s.source = { :git => 'https://example.invalid/grave-goods.git', :tag => s.version.to_s }
  s.source_files = 'ios/Sources/**/*.{swift,h,m,c,cc,mm,cpp}'
  s.ios.deployment_target = '15.0' # StoreKit 2 (Product, Transaction, AppStore.sync) starts at iOS 15
  s.dependency 'Capacitor'
  s.frameworks = 'StoreKit'
  s.swift_version = '5.5' # async/await
end
