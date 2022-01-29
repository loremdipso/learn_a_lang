#!/usr/bin/env ruby
require 'erb'

class BundleData
	def initialize()
		@global_css = File.read("global.css")
		@bundle_css = File.read("build/bundle.css")
		@bundle_js = File.read("build/bundle.js")
	end

	def get_binding
		binding
	end
end

def main()
	Dir.chdir(File.join(__dir__, "..", "docs")) do
		data = BundleData.new
		html = ERB.new(File.read("bundled.rhtml")).result(data.get_binding)
		File.open("bundled.html", "w") {|f| f.print(html)}
	end
	puts "Done"
end

main()